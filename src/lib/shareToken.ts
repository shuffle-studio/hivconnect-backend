/**
 * Signed, expiring share tokens for public membership-application links.
 *
 * SHU-1017 — Membership Application Export & Share.
 *
 * Runtime is Cloudflare Workers, so this module uses ONLY Web Crypto
 * (`crypto.subtle`) and Workers-safe base64url helpers — never `node:crypto`
 * or Node `Buffer`.
 *
 * Token format: `base64url(JSON payload) + '.' + base64url(HMAC-SHA256 sig)`.
 * The HMAC key is derived from `process.env.PAYLOAD_SECRET`.
 *
 * PII safety: this module never logs payloads or the secret.
 */

/** Claims carried by a share token. */
export interface ShareTokenPayload {
  /** Membership application id. */
  appId: string
  /** Expiry as epoch milliseconds. */
  exp: number
}

const encoder = new TextEncoder()
const decoder = new TextDecoder()

/** Encode raw bytes as URL-safe base64 without padding. */
export function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** Decode URL-safe base64 (padding optional) back into raw bytes. */
export function base64UrlToBytes(s: string): Uint8Array {
  const normalized = s.replace(/-/g, '+').replace(/_/g, '/')
  const pad = normalized.length % 4
  const padded = pad === 0 ? normalized : normalized + '='.repeat(4 - pad)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

/**
 * Import the HMAC-SHA256 key from `process.env.PAYLOAD_SECRET`.
 * Throws if the secret is missing or empty.
 */
async function importKey(): Promise<CryptoKey> {
  const secret = process.env.PAYLOAD_SECRET
  if (!secret) {
    throw new Error('PAYLOAD_SECRET is not set; cannot sign or verify share tokens')
  }
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}

/** Sign a payload, returning a `payload.signature` share token. */
export async function signShareToken(payload: ShareTokenPayload): Promise<string> {
  const key = await importKey()
  const payloadBytes = encoder.encode(JSON.stringify(payload))
  const payloadB64 = bytesToBase64Url(payloadBytes)
  const signature = await crypto.subtle.sign('HMAC', key, payloadBytes)
  const sigB64 = bytesToBase64Url(new Uint8Array(signature))
  return `${payloadB64}.${sigB64}`
}

/** Narrow an unknown decoded value to a valid `ShareTokenPayload`. */
function isValidPayload(value: unknown): value is ShareTokenPayload {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.appId === 'string' &&
    candidate.appId.length > 0 &&
    typeof candidate.exp === 'number' &&
    Number.isFinite(candidate.exp)
  )
}

/**
 * Verify a share token. Returns the decoded payload when the signature is
 * valid and the token has not expired; otherwise returns `null`.
 *
 * NEVER throws — any failure (missing secret, malformed token, bad base64,
 * signature mismatch, expired) resolves to `null`. The signature check uses
 * `crypto.subtle.verify`, which is constant-time.
 */
export async function verifyShareToken(token: string): Promise<ShareTokenPayload | null> {
  try {
    if (typeof token !== 'string') {
      return null
    }
    const parts = token.split('.')
    if (parts.length !== 2) {
      return null
    }
    const [payloadB64, sigB64] = parts
    if (!payloadB64 || !sigB64) {
      return null
    }

    const payloadBytes = base64UrlToBytes(payloadB64)
    const signatureBytes = base64UrlToBytes(sigB64)

    const key = await importKey()
    // crypto.subtle.verify performs a constant-time signature comparison.
    const valid = await crypto.subtle.verify('HMAC', key, signatureBytes, payloadBytes)
    if (!valid) {
      return null
    }

    const decoded: unknown = JSON.parse(decoder.decode(payloadBytes))
    if (!isValidPayload(decoded)) {
      return null
    }
    if (decoded.exp <= Date.now()) {
      return null
    }
    return decoded
  } catch {
    return null
  }
}
