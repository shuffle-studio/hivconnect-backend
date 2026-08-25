# Events v2 - parked scaffold

**Not compiled.** `docs` is in `tsconfig.json`'s `exclude` list. These files are
reference material for the v2 SOW, not part of the build.

## Why they are here and not in `src/`

`tsconfig.json` uses `"include": ["**/*.ts"]` - the whole repo, not just `src/`.
`next build` runs "Linting and checking validity of types" across everything it
includes, so an unimported file still has to compile. Dropping these into `src/`
broke the Cloudflare deploy on 2026-08-25 with:

    ./src/collections/EventRegistrations.ts:86:21
    Type error: Property 'registration' does not exist on type 'Event'.

That error is correct and expected: `EventRegistrations.ts` reads
`event.registration`, a field group that only exists once
`eventRegistrationFields` is spread into `Events.ts` and `payload generate:types`
is re-run. The fix was not to add the field - that would put unsold RSVP and
recurrence UI in the client's CMS - but to take the file out of the build.

**Anything added to `src/` must compile, wired or not.** Remember this before
scaffolding into this repo again.

## Wiring order, when v2 is sold

1. `cp fields/*.ts src/fields/` - spread `eventRecurrenceFields` and
   `eventRegistrationFields` into `Events.ts` `fields`; add `syncRRuleHook` to
   `Events.hooks.beforeChange`.
2. `pnpm payload generate:types` - regenerates `Event` with `recurrence` and
   `registration`. Do this BEFORE moving `EventRegistrations.ts` back.
3. `cp EventRegistrations.ts src/collections/` and register it in
   `payload.config.ts` `collections`.
4. `cp ics.ts eventNotifications.ts src/lib/` and
   `eventsCalendarFeed.ts src/endpoints/`; set
   `Events.endpoints = eventCalendarEndpoints`.
5. `pnpm payload migrate:create` and commit the migration.
6. Typecheck with the repo's real config - `pnpm exec tsc --noEmit` - not a
   targeted file list. A targeted run is what missed this the first time.

No `generate:importmap` step is needed: none of these add a custom admin React
component. Run it only if a `.tsx` admin field component is added later.

## Not included

Stripe (`stripe.ts`, `eventPayments.ts`) moved to `_to_delete/`. This is a
Ryan White Part A planning council running free community events; nothing in the
brief or the client's history asks for payments. Recoverable from git history at
commit `8651100` if that ever changes.
