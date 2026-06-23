'use client'

import React, { useState } from 'react'
import { Button, useDocumentInfo } from '@payloadcms/ui'

type Expiry = '1h' | '24h' | '7d'

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

const successStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  wordBreak: 'break-all',
}

const MembershipExportActions: React.FC = () => {
  const { id } = useDocumentInfo()
  const docId = id ? String(id) : ''

  const [expiresIn, setExpiresIn] = useState<Expiry>('24h')
  const [creating, setCreating] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [shareExpiry, setShareExpiry] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const disabled = !docId

  const pdfHref = docId ? `/api/membership-applications/${docId}/pdf` : undefined
  const docxHref = docId ? `/api/membership-applications/${docId}/docx` : undefined

  const handleDownload = (href?: string) => {
    if (!href) return
    window.location.href = href
  }

  const handleCreateShareLink = async () => {
    if (!docId) return
    setCreating(true)
    setError(null)
    setShareUrl(null)
    setShareExpiry(null)

    try {
      const res = await fetch(`/api/membership-applications/${docId}/share-link`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expiresIn }),
      })

      if (!res.ok) {
        throw new Error('Request failed')
      }

      const data = (await res.json()) as { url?: string; expiresAt?: string }
      if (!data.url) {
        throw new Error('Malformed response')
      }

      try {
        await navigator.clipboard.writeText(data.url)
      } catch {
        // Clipboard may be unavailable; still surface the URL below.
      }

      const expiresLabel = data.expiresAt
        ? new Date(data.expiresAt).toLocaleString()
        : null

      setShareUrl(data.url)
      setShareExpiry(expiresLabel)
    } catch {
      setError('Could not create a share link. Please try again.')
    } finally {
      setCreating(false)
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

      {shareUrl ? (
        <p style={successStyle} role="status">
          Link copied.{shareExpiry ? ` Expires ${shareExpiry}.` : ''}
          <br />
          {shareUrl}
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
