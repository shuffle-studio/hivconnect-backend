# HIV Connect — Email Setup Runbook

**Ticket:** SHU-976 · **Domain:** hivconnectcentralnj.com · **DNS:** Cloudflare (Shuffle Studio account)

Goal: provision domain email by **forwarding to the council's Gmail** (free, via Cloudflare Email Routing), add **form-submission notifications**, and finish with **DMARC enforcement**. Do the parts in order.

---

## Part 0 — Pre-flight (don't skip)

Enabling Email Routing **replaces the current MX** (`mailspamprotection.com`), so any mail currently delivered to a real `@hivconnectcentralnj.com` mailbox on the old host will stop.

- [ ] Confirm with the client (the Terri draft asks this) that they only use Gmail and there's **no active `@hivconnectcentralnj.com` mailbox** still in use.
- [ ] If unsure, ask the original web host whether mailboxes exist before cutting over.

Current records (for reference / rollback):
- **MX:** `10 mx10.mailspamprotection.com`, `20 mx20…`, `30 mx30…`
- **SPF:** `v=spf1 +a +mx +ip4:35.206.107.64 include:hivconnectcentralnj.com.spf.auto.dnssmarthost.net ~all`
- **DMARC** (`_dmarc`): `v=DMARC1; p=none; aspf=r; adkim=r;`

---

## Part 1 — Cloudflare Email Routing (receive → Gmail)

1. Cloudflare dashboard → **hivconnectcentralnj.com** → **Email** → **Email Routing** → **Get started / Enable**.
2. When prompted, let Cloudflare **add the required DNS records automatically**. It will:
   - Replace the MX with `route1.mx.cloudflare.net`, `route2…`, `route3…`
   - Add an SPF TXT: `v=spf1 include:_spf.mx.cloudflare.net ~all`
   > ⚠️ This overwrites the old SPF. We'll re-merge senders in Part 4 — note the old value above.
3. **Destination addresses** → **Add** → enter the council Gmail (`mshtga.planning.council.fcc@gmail.com`). Cloudflare emails that inbox a verification link → **someone on the council must click it** (the one client step).
4. **Routing rules** → **Create address**:
   - `info@hivconnectcentralnj.com` → council Gmail
   - (optional) `planningcouncil@…`, `membership@…` → council Gmail
   - (optional) **Catch-all** → council Gmail (catches anything@domain)
5. **Test:** from any outside account, email `info@hivconnectcentralnj.com` → confirm it arrives in the Gmail (check spam too).

✅ Done = they now **receive** mail at domain addresses, landing in their Gmail.

---

## Part 2 — (Optional) Sending *as* the domain

Email Routing is **receive-only**. If they want to *reply as* `info@hivconnectcentralnj.com` (not just from their Gmail address):

1. In Gmail → Settings → Accounts → **Send mail as** → Add another email address.
2. Point it at an SMTP relay (use the Resend SMTP creds from Part 3, or Google Workspace).
3. Verify the address (Gmail sends a code — which arrives via the Part 1 forward).

Most orgs skip this and just reply from their normal Gmail. Confirm which they want.

---

## Part 3 — Form-submission notifications (app-sent email)

So the council gets an email when a new application or contact message comes in. This is **transactional** mail (not a mailbox).

1. **Resend** (free tier; we already use it on other projects):
   - Create/verify a sending domain — use a subdomain to keep it isolated from the routing SPF: `mail.hivconnectcentralnj.com`.
   - Resend gives DKIM + SPF + (optional) a return-path record → add them in Cloudflare DNS (CNAME/TXT). Using `mail.` means these **don't collide** with the root SPF from Part 1.
   - Grab the `RESEND_API_KEY`.
2. **Worker secret:** `npx wrangler secret put RESEND_API_KEY` (encrypted secret — do **not** put it in `wrangler.jsonc`).
3. **Payload adapter** in `src/payload.config.ts`:
   ```ts
   import { resendAdapter } from '@payloadcms/email-resend'
   // ...
   email: resendAdapter({
     defaultFromAddress: 'notifications@mail.hivconnectcentralnj.com',
     defaultFromName: 'HIV Connect Central NJ',
     apiKey: process.env.RESEND_API_KEY || '',
   }),
   ```
4. **Notify hook** — add an `afterChange` to `MembershipApplications` and `ContactSubmissions` that, on `operation === 'create'`, calls `req.payload.sendEmail({ to: <council inbox>, subject, html })`. Keep the body minimal (name + type + "view in CMS" link) — avoid putting sensitive applicant detail in the email body.
5. Deploy backend (`pnpm run deploy`) and submit a test to confirm the email arrives.

---

## Part 4 — SPF / DMARC finalize (after Parts 1 & 3 are live)

1. **SPF** — make one clean record listing only real senders. With CF Routing + Resend on a subdomain, the root stays simple:
   ```
   v=spf1 include:_spf.mx.cloudflare.net ~all
   ```
   (Drop the legacy `dnssmarthost`/`ip4` includes once confirmed unused.)
2. **DMARC monitoring** — update `_dmarc` to start collecting reports, keep enforcement off:
   ```
   v=DMARC1; p=none; rua=mailto:dmarc@hivconnectcentralnj.com; aspf=r; adkim=r;
   ```
   (Or point `rua` at a Gmail/route address.) Watch reports ~2–4 weeks.
3. **Enforce** once reports show only legit senders passing:
   ```
   v=DMARC1; p=quarantine; rua=mailto:dmarc@hivconnectcentralnj.com; aspf=r; adkim=r;
   ```
   then later `p=reject`.

---

## Rollback

If mail breaks after Part 1: in Email Routing, disable it and restore the original MX (`mx10/20/30.mailspamprotection.com`) and the original SPF (saved in Part 0). DNS changes propagate in minutes (TTL 300s).
