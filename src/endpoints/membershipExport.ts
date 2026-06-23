/**
 * Custom endpoints for membership-application export & share (SHU-1017).
 *
 * Mounted on the `membership-applications` collection:
 *   GET  /:id/pdf          — authenticated; returns the application as a PDF
 *   GET  /:id/docx         — authenticated; returns the application as a .docx
 *   POST /:id/share-link   — authenticated; signs a token, logs it, returns { url, expiresAt }
 *   GET  /share/:token     — public; validates the token only, returns the PDF
 *
 * Runtime is Cloudflare Workers (OpenNext) — pure JS only, Web Crypto for HMAC.
 * PII safety: handlers never log application field values, and the public share
 * route reveals NOTHING (just a friendly 403) when a token is invalid/expired.
 */

import type { Endpoint, PayloadHandler, PayloadRequest } from 'payload'

import { buildApplicationView } from '../lib/membershipApplicationView'
import { generateApplicationPdf } from '../lib/generatePdf'
import { generateApplicationDocx } from '../lib/generateDocx'
import { signShareToken, verifyShareToken } from '../lib/shareToken'

const COLLECTION = 'membership-applications'
const ORG_SERVER_URL =
  process.env.PAYLOAD_PUBLIC_SERVER_URL || 'https://login.hivconnectcentralnj.com'

const PDF_MIME = 'application/pdf'
const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

/** Supported share-link expiry windows, in milliseconds. */
const EXPIRY_MS: Record<string, number> = {
  '1h': 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
}
const DEFAULT_EXPIRY = '24h'

/** Resolve an `expiresIn` token to a duration in ms (defaults to 24h). */
function resolveExpiryMs(expiresIn: unknown): number {
  if (typeof expiresIn === 'string' && expiresIn in EXPIRY_MS) {
    return EXPIRY_MS[expiresIn]
  }
  return EXPIRY_MS[DEFAULT_EXPIRY]
}

/** Read the `:id` route param as a string, if present. */
function getRouteParam(req: PayloadRequest, key: string): string | undefined {
  const value = req.routeParams?.[key]
  return value === undefined || value === null ? undefined : String(value)
}

/** Build a safe, non-PII filename slug for downloads. */
function downloadFilename(view: { documentTitle: string }, ext: string): string {
  const base = view.documentTitle.replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/\s+/g, '-')
  return `${base || 'membership-application'}.${ext}`
}

/** Load the application doc by id, or return null if it does not exist. */
async function loadApplication(
  req: PayloadRequest,
  id: string,
): Promise<Record<string, any> | null> {
  try {
    const doc = await req.payload.findByID({
      collection: COLLECTION,
      id,
      depth: 1,
      overrideAccess: true,
    })
    return (doc as Record<string, any>) ?? null
  } catch {
    return null
  }
}

/** Best-effort load of the optional letterhead logo from `public/`. */
async function loadLogo(req: PayloadRequest): Promise<Uint8Array | null> {
  try {
    const res = await fetch(`${ORG_SERVER_URL}/letterhead-logo.png`)
    if (!res.ok) return null
    const buf = await res.arrayBuffer()
    return new Uint8Array(buf)
  } catch {
    return null
  }
}

/** GET /:id/pdf — authenticated PDF download. */
const pdfHandler: PayloadHandler = async (req) => {
  if (!req.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const id = getRouteParam(req, 'id')
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 })

  const doc = await loadApplication(req, id)
  if (!doc) return Response.json({ error: 'Not found' }, { status: 404 })

  const view = buildApplicationView(doc)
  const logo = await loadLogo(req)
  const bytes = await generateApplicationPdf(view, { logo })

  return new Response(bytes as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': PDF_MIME,
      'Content-Disposition': `attachment; filename="${downloadFilename(view, 'pdf')}"`,
    },
  })
}

/** GET /:id/docx — authenticated Word download. */
const docxHandler: PayloadHandler = async (req) => {
  if (!req.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const id = getRouteParam(req, 'id')
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 })

  const doc = await loadApplication(req, id)
  if (!doc) return Response.json({ error: 'Not found' }, { status: 404 })

  const view = buildApplicationView(doc)
  const logo = await loadLogo(req)
  const bytes = await generateApplicationDocx(view, { logo })

  return new Response(bytes as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': DOCX_MIME,
      'Content-Disposition': `attachment; filename="${downloadFilename(view, 'docx')}"`,
    },
  })
}

/** POST /:id/share-link — authenticated; signs a token + writes audit log. */
const shareLinkHandler: PayloadHandler = async (req) => {
  if (!req.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const id = getRouteParam(req, 'id')
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 })

  // Confirm the application exists before issuing a link.
  const doc = await loadApplication(req, id)
  if (!doc) return Response.json({ error: 'Not found' }, { status: 404 })

  let expiresIn: unknown = DEFAULT_EXPIRY
  try {
    const body = (await req.json?.()) as { expiresIn?: unknown } | undefined
    if (body && 'expiresIn' in body) expiresIn = body.expiresIn
  } catch {
    // No/invalid body — fall back to the default expiry.
  }

  const exp = Date.now() + resolveExpiryMs(expiresIn)
  const token = await signShareToken({ appId: id, exp })
  const expiresAt = new Date(exp).toISOString()
  const url = `${ORG_SERVER_URL}/api/${COLLECTION}/share/${token}`

  // Write the audit-trail row (server-side; access is locked otherwise).
  try {
    await req.payload.create({
      collection: 'membership-share-log',
      data: {
        // D1 uses integer ids; the route param arrives as a string.
        application: Number(id),
        sharedBy: req.user?.id,
        expiresAt,
      },
      overrideAccess: true,
    })
  } catch {
    // Audit write failure must not block link creation, but should be visible.
    req.payload.logger.error('SHU-1017: failed to write membership-share-log entry')
  }

  return Response.json({ url, expiresAt }, { status: 200 })
}

/** GET /share/:token — public; token-gated PDF. Reveals nothing on bad token. */
const shareOpenHandler: PayloadHandler = async (req) => {
  const token = getRouteParam(req, 'token')
  const payload = token ? await verifyShareToken(token) : null

  if (!payload) {
    // Invalid or expired: reveal NOTHING about the application.
    return new Response('This link is expired or invalid.', {
      status: 403,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }

  const doc = await loadApplication(req, payload.appId)
  if (!doc) {
    return new Response('This link is expired or invalid.', {
      status: 403,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }

  const view = buildApplicationView(doc)
  const logo = await loadLogo(req)
  const bytes = await generateApplicationPdf(view, { logo })

  return new Response(bytes as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': PDF_MIME,
      // Inline so the recipient can view it directly in the browser.
      'Content-Disposition': `inline; filename="${downloadFilename(view, 'pdf')}"`,
    },
  })
}

/** All export/share endpoints for the membership-applications collection. */
export const membershipExportEndpoints: Endpoint[] = [
  { path: '/:id/pdf', method: 'get', handler: pdfHandler },
  { path: '/:id/docx', method: 'get', handler: docxHandler },
  { path: '/:id/share-link', method: 'post', handler: shareLinkHandler },
  { path: '/share/:token', method: 'get', handler: shareOpenHandler },
]
