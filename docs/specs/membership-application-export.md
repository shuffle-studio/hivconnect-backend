# Feature Spec: Membership Application Export & Share

**Project:** HIV Connect Central NJ (backend)
**Constitution Reference:** HIV Connect Constitution (Linear — to link)
**Priority:** P2
**Status:** Draft — open questions resolved
**Author:** Jose / Shuffle Studio
**Date:** 2026-06-23

---

## Problem Statement

When a Planning Council membership application is submitted, Terri (and other
authorized reviewers) need to get the application *out of the admin panel* — to
print it, file it, attach it to an email, or hand it to a committee member who
doesn't have admin access. Today Payload only shows the application in the edit
view. There is no way to download it as a formatted document or share it with
someone outside the admin.

This matters because membership review is a human, committee-driven process.
Reviewers work with paper and shared documents, not database rows.

## User Stories

### P1 — Must Have
- As a reviewer (Terri), I want to **download an application as a PDF** so that I can print or file a clean, formatted copy.
- As a reviewer, I want to **download an application as a Word (.docx)** so that I can edit, annotate, or paste it into other documents.

### P2 — Should Have
- As a reviewer, I want to **generate a secure, time-limited share link** so that a committee member without admin access can view/download a specific application.

### P3 — Nice to Have
- As a reviewer, I want the export to **clearly mark blank/optional fields** so the document reflects exactly what the applicant submitted.
- As a reviewer, I want a **"download all selected"** action from the list view for batch printing.

## Acceptance Scenarios

### Scenario: Download PDF
- **Given** Terri is logged into the admin and viewing an application
- **When** she clicks "Download PDF" in the sidebar
- **Then** a formatted PDF of that application downloads to her computer

### Scenario: Download Word doc
- **Given** Terri is viewing an application
- **When** she clicks "Download Word"
- **Then** an editable .docx of that application downloads

### Scenario: Share link
- **Given** Terri is viewing an application
- **When** she clicks "Create share link"
- **Then** she receives a copyable URL that opens the application's PDF, and that link stops working after it expires

### Scenario: Expired / tampered link is rejected
- **Given** a share link has expired or been altered
- **When** someone opens it
- **Then** they see an "expired or invalid link" message and no application data

## Constraints
- Applications contain **sensitive PII** (DOB, contact info, HIV-related experience). Export and especially share links must protect this data.
- Runtime is **Cloudflare Workers** (OpenNext) — no Node-only libraries, no local filesystem.
- Reviewers are **non-technical**; the action must be one obvious button, no config.
- Must work within the existing admin auth (logged-in users only for export).

## Out of Scope
- Editing applications inside the exported document and syncing back.
- Public, un-gated download of applications.
- Bulk CSV/spreadsheet export (the official import-export plugin already covers that need separately).
- E-signature on the application (would be a Documenso integration, separate feature).

## Resolved Decisions
*(Originally open questions — resolved 2026-06-23.)*

- **Share-link expiry:** Reviewer-chosen, defaulting to **24 hours**. The "Create share link" UI offers an expiry selector pre-set to 24h.
- **Link reuse:** Links are **reusable until expiry** (not single-use). Anyone with the link can open the application until the link expires.
- **Logo / letterhead:** **Yes.** PDF and DOCX carry the HIV Connect logo/letterhead. Assets live in the repo `public/` folder and match the website's brand specs (logo, colors, typography).
- **Audit trail:** **Yes.** Every share-link creation (and ideally each export) is logged — who, which application, when, and the link's expiry — for the PII audit trail.

---

# Technical Plan: Membership Application Export & Share

**Status:** Draft

## Implementation Approach

Add per-document export to the existing `membership-applications` collection
using **Payload custom endpoints** plus a small **admin UI component** that
renders the action buttons in the sidebar. All document generation happens
server-side in the Worker, reusing the data already in D1. No new collection is
strictly required; a lightweight share-token can be stateless (signed) to avoid
DB writes.

## Technology Choices

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Doc generation (DOCX) | `docx` npm | Pure JS, runs on Workers, gives an editable Word file |
| Doc generation (PDF) | `pdf-lib` (primary) | Pure JS, Workers-compatible, no new infra. Manual layout but fine for a form |
| Doc generation (PDF, "pretty" option) | Cloudflare Browser Rendering (Puppeteer binding) → render an HTML template | Best-looking output with letterhead, but adds a binding + cost. Decide in design pass |
| API | Payload collection `endpoints` | Built-in, inherits collection auth context |
| Share-link auth | HMAC signed token via Web Crypto (`crypto.subtle`) | Forgery-proof, Workers-native, signed with `PAYLOAD_SECRET`. Token encodes `{ appId, exp }` |
| Share audit log | New `membership-share-log` collection | Records who created each link, which application, when, and expiry — for the PII audit trail |
| Branding assets | Logo/letterhead in repo `public/` folder | Matches website brand specs; embedded into PDF (via `pdf-lib` image embed) and DOCX header |
| Admin UI | Custom `UIField` / sidebar component (React) | Standard Payload admin extension; matches existing patterns. Includes expiry selector (default 24h) |

## API Contracts

### Download PDF
- **Method:** GET
- **Path:** `/api/membership-applications/:id/pdf`
- **Auth:** Required (logged-in user) — same gate as collection `read`
- **Response:** `application/pdf` attachment

### Download DOCX
- **Method:** GET
- **Path:** `/api/membership-applications/:id/docx`
- **Auth:** Required
- **Response:** `application/vnd.openxmlformats-officedocument.wordprocessingml.document` attachment

### Create share link
- **Method:** POST
- **Path:** `/api/membership-applications/:id/share-link`
- **Auth:** Required
- **Request:** `{ "expiresIn": "24h" }` (optional; defaults to 24h, reviewer-selectable)
- **Response:** `{ "url": "https://login.hivconnectcentralnj.com/api/membership-applications/share/<token>", "expiresAt": "<ISO timestamp>" }`
- **Side effect:** writes a `membership-share-log` entry (creator, appId, createdAt, expiresAt)

### Open shared application (public, token-gated)
- **Method:** GET
- **Path:** `/api/membership-applications/share/:token`
- **Auth:** Public, but token signature + expiry validated before any data is read
- **Response:** `application/pdf` on valid token; 403 + friendly message otherwise

## Architecture Decisions
- **Signed tokens for verification + a log collection for audit.** The link itself stays a stateless HMAC-signed token (`{ appId, exp }`) so verification needs no DB lookup and links can't be forged or extended. Separately, each link *creation* writes a `membership-share-log` row so we have the "who shared what, when" audit trail. Links are reusable until `exp`; revocation-before-expiry is explicitly out of scope for v1 (would require checking the log on every open).
- **One shared "render" function** builds a field-by-field representation from the application doc; both PDF and DOCX generators consume it, so layout (including letterhead) stays consistent and there's one place to maintain.
- **Letterhead from `public/`** — logo and brand tokens (colors, fonts) live in the repo `public/` folder, matching website specs. `pdf-lib` embeds the logo image; the DOCX builder places it in the document header. No Browser Rendering binding needed for v1.
- **Reuse existing auth** — export and share-create endpoints rely on the collection's `read`/authenticated access; no new permission model. The public share-open endpoint gates on token validity only.

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| PII leak via share link | Med | High | 24h default expiry, signed (un-forgeable) tokens, audit log of every share. Links reusable-until-expiry by design — accept slightly wider exposure window in exchange for usability |
| No way to revoke a link before expiry | Low | Med | Out of scope for v1; short default expiry limits exposure. Revisit if reviewers ask (would mean checking the log on each open) |
| Letterhead inflates Worker bundle / time | Low | Low | Use an optimized logo asset from `public/`; embed once per render |
| `pdf-lib` layout is too plain for Terri | Low | Low | Letterhead + brand tokens cover most of it; Browser Rendering HTML→PDF remains the upgrade path if a richer design is wanted |
| Worker CPU/time limits on large docs | Low | Med | Applications are small; generate on demand, stream response |
| Library not Workers-compatible | Low | Med | `docx` and `pdf-lib` are confirmed pure-JS; avoid Puppeteer unless binding added |

## Dependencies
- `docx` and `pdf-lib` added to `package.json`.
- Logo/letterhead assets placed in `public/` (matching website brand specs) before the design pass.
- New `membership-share-log` collection registered in `payload.config.ts` (+ migration).
- Confirmed `PAYLOAD_SECRET` available in the Worker env (already is).

## Suggested Task Order (for the Tasks phase)
1. Add letterhead/brand assets to `public/`; shared `buildApplicationView(doc)` helper — field map + labels.
2. DOCX endpoint + generator with letterhead header (simplest, fully Workers-safe).
3. PDF endpoint + `pdf-lib` generator with embedded logo.
4. Admin sidebar component with Download buttons.
5. `membership-share-log` collection + migration.
6. Share-link sign/verify util + POST (writes log, default 24h) + public GET endpoints.
7. Add "Create share link" + expiry selector to the sidebar component.
