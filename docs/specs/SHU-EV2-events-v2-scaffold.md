# SHU-EV2 - Events v2 scaffold & v1 remediation

Status: **parked outside the build.** The v2 files live in
`docs/scaffold/events-v2/` and are excluded from `tsconfig.json`. See that
folder's README for the wiring order and the reason they are not in `src/`.

Wired and live: `src/lib/email.ts` (Resend adapter) only.

Trigger: Terri Fox, Aug 25 2026 - *"a timeframe for completing the 2nd part of
our contract stuff and basically when we can see the webcalendar changes."*

## The contract position

| Source | Says |
|---|---|
| SOW, Nov 2025 | "Events & Calendar module" is **out of scope**, deferred to v2 2026 |
| Change Order #1, Dec 11 2025 | Pulls EV001 Events MVP **into v1** for $2,000 |
| Change Order #1 | Defers 5 items to "2026 Enhancement" |
| Invoice 20260403-HIV | $2,000 paid June 2 2026 - EV001 is **paid for** |

### v1 remediation (owed - already billed and paid)

Change Order #1's EV001 frontend deliverables included, verbatim:

- "Calendar-style display (simple grid view)" - **NOT BUILT**
- "Filter by category and date range" - **NOT BUILT**
- "Simple recurring event support (optional)" - not built; marked optional
- Automatic frontend rebuild - built (`src/hooks/triggerFrontendRebuild.ts`)
- Event detail pages, mobile responsive, SEO - built

`hivconnect-frontend/src/pages/events/index.astro` renders a card grid of
upcoming events plus a list of past events. A CSS `grid` of cards is not a
calendar grid, and there are no filter controls at all. Verified against the
live site 2026-08-25.

**Do not bill this.** Ship it, then quote v2.

### v2 scope (the "second half")

The five deferred items, mapped to the files below.

## Files added

### hivconnect-backend (Cloudflare Worker, D1, R2)

| File | Item | Wiring needed |
|---|---|---|
| `src/fields/eventRecurrence.ts` | Recurrence | Spread `...eventRecurrenceFields` into `Events.fields`; add `syncRRuleHook` to `Events.hooks.beforeChange` |
| `src/fields/eventRegistrationSettings.ts` | EV2-04 | Spread `...eventRegistrationFields` into `Events.fields` |
| `src/lib/ics.ts` | EV2-02 | none (pure) |
| `src/endpoints/eventsCalendarFeed.ts` | EV2-02 | `Events.endpoints = eventCalendarEndpoints` |
| `src/collections/EventRegistrations.ts` | EV2-04/05 | Import + add to `payload.config.ts` `collections` |
| `src/lib/email.ts` | EV2-03 / v1 fix | **WIRED** - `email: resendAdapter` in `payload.config.ts` |
| `src/lib/eventNotifications.ts` | EV2-03 | none |
| `src/lib/stripe.ts` | EV2-06 | `pnpm add stripe` |
| `src/endpoints/eventPayments.ts` | EV2-06 | `createCheckout` → `EventRegistrations.endpoints`; `stripeEventsWebhook` → root `endpoints` in `payload.config.ts` |

`Events.ts` is LEAD-owned per `SHU-1017-build-contract.md`, which is why the new
fields live in `src/fields/` as spreadables rather than as a large diff to that
file.

A migration is required after wiring: `pnpm payload migrate:create`.

### hivconnect-frontend (Astro `output: 'static'`, Cloudflare Pages)

| File | Item |
|---|---|
| `src/lib/eventsCalendar.ts` | recurrence expansion, month grid, filter helpers |
| `src/components/events/EventsCalendar.tsx` | **v1 remediation** - month grid + category + date-range filters |
| `src/components/events/AddToCalendarButtons.tsx` | EV2-02 |
| `src/components/events/EventRsvpForm.tsx` | EV2-04/06 |

Wiring for `src/pages/events/index.astro` - replace the two `<section>` blocks
with a single island, keeping the existing fetch in frontmatter:

```astro
---
import EventsCalendar from '../../components/events/EventsCalendar';
const allEvents = [...upcomingEvents, ...pastEvents];
const today = new Date().toISOString();
---
<EventsCalendar client:load events={allEvents} today={today} />
```

`client:load` (not `client:visible`) - the calendar is the page's primary
content and should not pop in.

## Platform notes

**It is all Cloudflare.** Backend = Worker (OpenNext) + D1 + R2. Frontend =
Astro static on Cloudflare Pages (`public/_headers`, `public/_redirects`).

- `hivconnect-frontend/netlify.toml` is **stale** and should be deleted. Its CSP
  sets `connect-src 'self' https://api.netlify.com`, which would block every
  call to the backend. The live CSP is `public/_headers`, and it already
  allowlists `login.hivconnectcentralnj.com` and `challenges.cloudflare.com` -
  so the RSVP island needs no header change.
- The frontend is **static**: it has no server routes. Every dynamic thing here
  (.ics feed, RSVP POST, Stripe webhook) must live on the backend Worker. That
  is why there is no `/api` directory in the frontend scaffold.
- **Stripe on Workers:** `shuffle/shuffle-studio/src/lib/stripe.ts` does
  `new Stripe(key)` with the SDK's default node:http client. That app runs on
  Node. This one does not. `src/lib/stripe.ts` here uses
  `Stripe.createFetchHttpClient()` and `constructEventAsync()`. Copying the
  shuffle-studio version verbatim throws at runtime, on the first real charge.
- **Email - FIXED.** `payload.config.ts` had no `email:` adapter at all, so
  `payload.sendEmail()` was a no-op and Payload's own transactional mail
  (password reset, verification) never sent. That is the likely root of the June
  2026 "notifications never arrived" thread and the two manual admin password
  resets. `src/lib/email.ts` is now wired as `email: resendAdapter`.
- **Comms are per-project, not shared.** Each project gets its own Resend key,
  verified domain and from-address. A shared sender means one project's bounce
  rate drags down every other project's deliverability, and a leaked key exposes
  all of them. HIV Connect especially should send as itself - recipients are
  being told about HIV services. `src/lib/email.ts` implements the Resend REST
  call directly (one POST) rather than adding `@payloadcms/email-resend`, which
  keeps the Worker bundle small and adds no dependency.

## Secrets to add (`wrangler secret put`)

```
RESEND_API_KEY           this project's own Resend key
EMAIL_FROM_ADDRESS       no-reply@hivconnectcentralnj.com   (var, not secret)
EMAIL_FROM_NAME          HIV Connect Central NJ             (var, not secret)
EVENTS_NOTIFY_TO         staff address for new-registration pings
STRIPE_SECRET_KEY        only if paid events ship
STRIPE_WEBHOOK_SECRET    only if paid events ship
TURNSTILE_SECRET_KEY     already set (used by ContactSubmissions)
```

Add `hivconnectcentralnj.com` as a domain in Resend and verify SPF + DKIM
before the first send. `shufflestudio-comms` is deliberately NOT used here.

## Typecheck status

Clean under `tsc --noEmit --skipLibCheck`:
`ics.ts`, `email.ts`, `eventNotifications.ts`, `eventRecurrence.ts`,
`eventRegistrationSettings.ts`, `eventsCalendarFeed.ts`, `EventRegistrations.ts`,
`payload.config.ts`. Frontend: all four new files clean under `strict: true`.

Not yet checkable: `lib/stripe.ts`, `endpoints/eventPayments.ts` - require
`pnpm add stripe`.

## PII

`event-registrations` holds names, emails, phone numbers and accommodation
requests of people attending HIV-services events. Per
`SHU-1017-build-contract.md`: never `console.log` field values. The staff
notification email deliberately carries only a record ID and a CMS link.


## Changelog

**2026-08-25 - v1 remediation SHIPPED.**
`hivconnect-frontend/src/pages/events/index.astro` now mounts
`<EventsCalendar client:load>`: month grid, category chips, date-range select,
calendar/list toggle. This closes the two outstanding EV001 frontend
deliverables. Run `npm ci && npm run build` to confirm before deploying - the
device VM has no `node_modules`, so this was verified by typecheck, not a build.

Deliberately NOT shipped in that change: the "Subscribe to this calendar" link,
because `/api/events/calendar.ics` is v2 scope and not registered. What is live
depends on nothing unwired.

**2026-08-25 - comms moved to per-project Resend.**
`src/lib/comms.ts` (shared shufflestudio-comms Worker) superseded by
`src/lib/email.ts` + `src/lib/eventNotifications.ts`. Old file staged in
`_to_delete/`.


**2026-08-25 - v2 scaffolds moved OUT of `src/`.**
Putting them in `src/` broke the Cloudflare deploy. `tsconfig.json` uses
`"include": ["**/*.ts"]` - the whole repo - and `next build` typechecks
everything included, imported or not. First failure:

    ./src/collections/EventRegistrations.ts:86:21
    Type error: Property 'registration' does not exist on type 'Event'

correct and expected, since `eventRegistrationFields` was never spread into
`Events.ts` and types were never regenerated. Three more failures were queued
behind it (`stripe.ts` imports an uninstalled package).

Resolution: v2 files → `docs/scaffold/events-v2/`; Stripe files → `_to_delete/`;
`docs` and `_to_delete` added to `tsconfig.json` `exclude`. Verified with the
project's real config (`tsc --noEmit -p tsconfig.json`, exit 0, 79 files) rather
than a targeted file list - the targeted run is what missed this originally.

**Rule for this repo: anything under a path `tsconfig.json` includes must
compile, whether or not it is imported.**

**Stripe dropped from v2 scope.** Ryan White Part A planning council, free
community events, no payment need in the brief or client history. Files in
`_to_delete/`, recoverable from commit `8651100`.
