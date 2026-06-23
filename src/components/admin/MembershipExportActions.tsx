'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Button, useDocumentInfo } from '@payloadcms/ui'

type Expiry = '1h' | '24h' | '7d'

type ShareLinkStatus = 'active' | 'expired' | 'revoked'

interface ShareLink {
  id: string | null
  createdAt: string | null
  expiresAt: string | null
  status: ShareLinkStatus
  url: string | null
}

const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
  marginTop: '0.5rem',
}

const groupStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.25rem',
}

const hintStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  opacity: 0.7,
}

const errorStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: '#b3261e',
}

const listStyle: React.CSSProperties = {
  listStyle: 'none',
  margin: '0.25rem 0 0',
  padding: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
}

const rowStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.25rem',
  padding: '0.5rem',
  border: '1px solid var(--theme-elevation-150, #d9d9d9)',
  borderRadius: '4px',
}

const rowMetaStyle: React.CSSProperties = {
  fontSize: '0.72rem',
  opacity: 0.8,
}

const urlStyle: React.CSSProperties = {
  fontSize: '0.7rem',
  wordBreak: 'break-all',
  userSelect: 'all',
}

const rowActionsStyle: React.CSSProperties = {
  display: 'flex',
  gap: '0.5rem',
  flexWrap: 'wrap',
  alignItems: 'center',
}

const badgeBase: React.CSSProperties = {
  fontSize: '0.68rem',
  fontWeight: 600,
  padding: '0.1rem 0.4rem',
  borderRadius: '999px',
  textTransform: 'uppercase',
  letterSpacing: '0.02em',
}

const badgeStyles: Record<ShareLinkStatus, React.CSSProperties> = {
  active: { ...badgeBase, background: '#e6f4ea', color: '#1e7e34' },
  expired: { ...badgeBase, background: '#f1f1f1', color: '#5f6368' },
  revoked: { ...badgeBase, background: '#fce8e6', color: '#b3261e' },
}

function formatDate(value: string | null): string {
  if (!value) return '—'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleString()
}

/** Copy text to the clipboard, falling back to a hidden textarea + execCommand. */
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // Fall through to the legacy path below.
  }

  try {
    const el = document.createElement('textarea')
    el.value = text
    el.setAttribute('readonly', '')
    el.style.position = 'absolute'
    el.style.left = '-9999px'
    document.body.appendChild(el)
    el.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(el)
    return ok
  } catch {
    return false
  }
}

const MembershipExportActions: React.FC = () => {
  const { id } = useDocumentInfo()
  const docId = id ? String(id) : ''

  const [expiresIn, setExpiresIn] = useState<Expiry>('24h')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [links, setLinks] = useState<ShareLink[]>([])
  const [loadingLinks, setLoadingLinks] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [revokingId, setRevokingId] = useState<string | null>(null)

  const isMounted = useRef(true)
  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  const disabled = !docId

  const pdfHref = docId ? `/api/membership-applications/${docId}/pdf` : undefined
  const docxHref = docId ? `/api/membership-applications/${docId}/docx` : undefined

  const handleDownload = (href?: string) => {
    if (!href) return
    window.location.href = href
  }

  const loadLinks = useCallback(async () => {
    if (!docId) return
    setLoadingLinks(true)
    try {
      const res = await fetch(`/api/membership-applications/${docId}/share-links`, {
        method: 'GET',
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Request failed')
      const data = (await res.json()) as { links?: ShareLink[] }
      if (isMounted.current) {
        setLinks(Array.isArray(data.links) ? data.links : [])
      }
    } catch {
      if (isMounted.current) {
        setError('Could not load share links.')
      }
    } finally {
      if (isMounted.current) setLoadingLinks(false)
    }
  }, [docId])

  useEffect(() => {
    void loadLinks()
  }, [loadLinks])

  const handleCreateShareLink = async () => {
    if (!docId) return
    setCreating(true)
    setError(null)
    setNotice(null)

    try {
      const res = await fetch(`/api/membership-applications/${docId}/share-link`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expiresIn }),
      })

      if (!res.ok) throw new Error('Request failed')

      const data = (await res.json()) as { url?: string; expiresAt?: string }
      if (!data.url) throw new Error('Malformed response')

      const copied = await copyText(data.url)
      const expiresLabel = data.expiresAt ? formatDate(data.expiresAt) : null
      setNotice(
        `${copied ? 'Link copied.' : 'Link created.'}${
          expiresLabel ? ` Expires ${expiresLabel}.` : ''
        }`,
      )
      await loadLinks()
    } catch {
      setError('Could not create a share link. Please try again.')
    } finally {
      if (isMounted.current) setCreating(false)
    }
  }

  const handleCopy = async (link: ShareLink) => {
    if (!link.url) return
    const ok = await copyText(link.url)
    setNotice(ok ? 'Link copied.' : 'Copy failed — select the link text below to copy.')
    if (isMounted.current) {
      setCopiedId(link.id)
      window.setTimeout(() => {
        if (isMounted.current) setCopiedId((cur) => (cur === link.id ? null : cur))
      }, 2000)
    }
  }

  const handleRevoke = async (link: ShareLink) => {
    if (!docId || !link.id) return
    const confirmed = window.confirm(
      'Stop this share link? Anyone holding it will immediately lose access.',
    )
    if (!confirmed) return

    setRevokingId(link.id)
    setError(null)
    setNotice(null)
    try {
      const res = await fetch(
        `/api/membership-applications/${docId}/share-link/${encodeURIComponent(
          link.id,
        )}/revoke`,
        { method: 'POST', credentials: 'include' },
      )
      if (!res.ok) throw new Error('Request failed')
      setNotice('Link stopped.')
      await loadLinks()
    } catch {
      setError('Could not stop the link. Please try again.')
    } finally {
      if (isMounted.current) setRevokingId(null)
    }
  }

  return (
    <div style={containerStyle}>
      <strong>Export application</strong>

      {disabled ? (
        <p style={hintStyle}>Save the application first to export.</p>
      ) : null}

      <div style={groupStyle}>
        <Button
          el="anchor"
          url={pdfHref}
          disabled={disabled}
          buttonStyle="secondary"
          size="small"
          onClick={() => handleDownload(pdfHref)}
        >
          Download PDF
        </Button>
        <Button
          el="anchor"
          url={docxHref}
          disabled={disabled}
          buttonStyle="secondary"
          size="small"
          onClick={() => handleDownload(docxHref)}
        >
          Download Word
        </Button>
      </div>

      <div style={groupStyle}>
        <label htmlFor="membership-share-expiry">Share link expiry</label>
        <select
          id="membership-share-expiry"
          value={expiresIn}
          disabled={disabled || creating}
          onChange={(e) => setExpiresIn(e.target.value as Expiry)}
        >
          <option value="1h">1 hour</option>
          <option value="24h">24 hours</option>
          <option value="7d">7 days</option>
        </select>
        <Button
          disabled={disabled || creating}
          buttonStyle="primary"
          size="small"
          onClick={handleCreateShareLink}
        >
          {creating ? 'Creating…' : 'Create share link'}
        </Button>
      </div>

      {!disabled ? (
        <div style={groupStyle}>
          <strong style={{ fontSize: '0.8rem' }}>Share links</strong>
          {loadingLinks && links.length === 0 ? (
            <p style={hintStyle}>Loading…</p>
          ) : null}
          {!loadingLinks && links.length === 0 ? (
            <p style={hintStyle}>No share links yet.</p>
          ) : null}

          {links.length > 0 ? (
            <ul style={listStyle}>
              {links.map((link, idx) => {
                const key = link.id ?? `row-${idx}`
                return (
                  <li key={key} style={rowStyle}>
                    <div style={rowActionsStyle}>
                      <span
                        style={badgeStyles[link.status]}
                        aria-label={`Status: ${link.status}`}
                      >
                        {link.status}
                      </span>
                      <span style={rowMetaStyle}>Created {formatDate(link.createdAt)}</span>
                    </div>
                    <span style={rowMetaStyle}>Expires {formatDate(link.expiresAt)}</span>

                    {link.url ? (
                      <span style={urlStyle} aria-label="Share link URL">
                        {link.url}
                      </span>
                    ) : (
                      <span style={hintStyle}>Link URL unavailable.</span>
                    )}

                    <div style={rowActionsStyle}>
                      <Button
                        buttonStyle="secondary"
                        size="small"
                        disabled={!link.url}
                        onClick={() => void handleCopy(link)}
                      >
                        {copiedId === link.id ? 'Copied' : 'Copy'}
                      </Button>
                      {link.status === 'active' ? (
                        <Button
                          buttonStyle="secondary"
                          size="small"
                          disabled={revokingId === link.id}
                          onClick={() => void handleRevoke(link)}
                        >
                          {revokingId === link.id ? 'Stopping…' : 'Stop'}
                        </Button>
                      ) : null}
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : null}
        </div>
      ) : null}

      {notice ? (
        <p style={hintStyle} role="status">
          {notice}
        </p>
      ) : null}

      {error ? (
        <p style={errorStyle} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export default MembershipExportActions
