# SHU-1017 Build Contract

Shared contracts that the parallel sub-agents implement against. The LEAD agent
owns `payload.config.ts`, `package.json`, and `MembershipApplications.ts`.
Sub-agents create NEW files only and MUST NOT edit those three shared files.

## Runtime constraints (all modules)

- Runtime is **Cloudflare Workers** (OpenNext), NOT Node. Use ONLY pure-JS,
  Workers-compatible libs: `docx`, `pdf-lib`. NO Puppeteer, NO `node:fs`, NO
  `node:crypto`, no native modules.
- Use **Web Crypto** (`crypto.subtle`) for HMAC — never `node:crypto`.
- **PII safety:** never `console.log` application field values. The public share
  endpoint reveals NOTHING on an invalid/expired token.
- TypeScript, ESM, `import`/`export`. Match existing style (2-space indent,
  single quotes, no semicolons-optional — follow neighbours).

## Foundation (already built by LEAD)

### `src/lib/membershipApplicationView.ts`

```ts
export interface ApplicationViewField { label: string; value: string; isBlank: boolean }
export interface ApplicationViewSection { title: string; fields: ApplicationViewField[] }
export interface ApplicationView {
  documentTitle: string      // e.g. "Membership Application #42" (non-PII)
  applicantName: string      // e.g. "Jane Doe"
  statusLabel: string        // e.g. "Pending Review"
  submittedAt?: string       // ISO timestamp
  sections: ApplicationViewSection[]
}
export const BLANK_MARKER: string  // marker for blank optional fields
export function buildApplicationView(doc: Record<string, any>): ApplicationView
```

Section order: Status, Personal Information, Contact, Employment, Demographics,
Experience, Commitment, Admin Notes.

### `src/collections/MembershipShareLog.ts`

Slug `membership-share-log`. Fields: `application` (relationship →
membership-applications), `sharedBy` (relationship → users), `expiresAt` (date),
plus auto `createdAt`. Authenticated read; create disabled in admin (written
server-side via local API with `overrideAccess: true`).

## Shared branding constants

- Logo asset path: `public/letterhead-logo.png` (PNG). If absent at runtime,
  generators MUST fall back to a text-only letterhead — do NOT throw.
- Org name: `HIV Connect Central NJ`.
- Brand color (hex): `#1B7FB3` (header accent). Use as fallback constant in each
  generator; do not import from a shared file to keep modules independent.

## Sub-agent modules (NEW files)

### A — `src/lib/generatePdf.ts`

```ts
import type { ApplicationView } from './membershipApplicationView'
export interface GeneratePdfOptions { logo?: Uint8Array | null }
export async function generateApplicationPdf(
  view: ApplicationView,
  opts?: GeneratePdfOptions,
): Promise<Uint8Array>
```

- Use `pdf-lib`. Embed `opts.logo` (PNG bytes) as letterhead if provided; else
  draw a text letterhead (org name in brand color). Title, applicant name,
  status, submitted date in the header block.
- Render each section as a heading followed by `label: value` lines. Blank
  fields show `BLANK_MARKER`. Wrap long text values; paginate when the page
  fills. Returns the finished PDF bytes (`await doc.save()`).

### B — `src/lib/generateDocx.ts`

```ts
import type { ApplicationView } from './membershipApplicationView'
export interface GenerateDocxOptions { logo?: Uint8Array | null }
export async function generateApplicationDocx(
  view: ApplicationView,
  opts?: GenerateDocxOptions,
): Promise<Uint8Array>
```

- Use `docx`. Put the logo (if provided) in the document **header**; else a text
  header with org name. Build a `Document` with section paragraphs: section
  titles as headings, fields as `label: value`. Blank fields show `BLANK_MARKER`.
- Return bytes via `Packer.toBuffer(doc)` converted to `Uint8Array`
  (`new Uint8Array(await Packer.toBuffer(doc))` — `toBuffer` is Workers-safe).

### C — `src/lib/shareToken.ts`

```ts
export interface ShareTokenPayload { appId: string; exp: number } // exp = epoch ms
export async function signShareToken(payload: ShareTokenPayload): Promise<string>
export async function verifyShareToken(token: string): Promise<ShareTokenPayload | null>
```

- HMAC-SHA256 via `crypto.subtle`, key = `process.env.PAYLOAD_SECRET`.
- Token format: `base64url(JSON payload) + '.' + base64url(HMAC signature)`.
- `verifyShareToken` returns `null` (never throws) on: malformed token, bad
  signature, or `exp` in the past. Use a constant-time compare for the signature.
- base64url helpers must be Workers-safe (no `Buffer`; use `btoa`/`atob` with
  URL-safe replacement, or `Uint8Array` <-> base64).

### D — `src/components/admin/MembershipExportActions.tsx`

- Payload admin custom **UI field** component (client component, `'use client'`).
  Rendered in the application edit view sidebar.
- Buttons: **Download PDF**, **Download Word**, and **Create share link** with an
  expiry `<select>` (options: 1h, 24h [default], 7d) that POSTs and then copies
  the returned URL to the clipboard, showing the URL + expiry.
- Endpoint paths (relative, same origin):
  - PDF: `GET /api/membership-applications/{id}/pdf`
  - DOCX: `GET /api/membership-applications/{id}/docx`
  - Share: `POST /api/membership-applications/{id}/share-link` body
    `{ "expiresIn": "24h" }` → `{ url, expiresAt }`
- Get the current doc id from `useDocumentInfo()` (`@payloadcms/ui`). For
  downloads, navigate/anchor to the URL (browser handles Content-Disposition);
  include `credentials: 'include'` where fetching. Disable buttons when there is
  no id yet (unsaved new doc).
- Default export a React component compatible with Payload's `UIField`
  `admin.components.Field` slot.

## Endpoints (LEAD wires into MembershipApplications.endpoints)

- `GET /:id/pdf` — auth required; 200 `application/pdf`, `Content-Disposition: attachment`.
- `GET /:id/docx` — auth required; 200 docx mime, attachment.
- `POST /:id/share-link` — auth required; writes `membership-share-log`; returns `{ url, expiresAt }`.
- `GET /share/:token` — public; validates token only; 200 `application/pdf` inline
  on valid, 403 friendly text otherwise. Reveals nothing on bad token.

`expiresIn` parsing: `1h` → 3600_000 ms, `24h` → 86_400_000, `7d` → 604_800_000.
Default 24h when omitted/invalid.
