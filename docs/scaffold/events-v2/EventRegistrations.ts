import type { CollectionConfig } from 'payload';
import { sendRsvpConfirmation, notifyStaffOfRsvp, isEmailConfigured } from '../lib/eventNotifications';

/**
 * EV2-04 / EV2-05 - RSVP + attendee management.
 *
 * Change Order #1 deferred "Event registration/RSVP system" and "Attendee
 * management" to 2026. Today the only RSVP affordance is Events.rsvpLink, a
 * text field pointing at somebody else's form.
 *
 * Follows the ContactSubmissions / MembershipApplications pattern already in
 * this repo: public create guarded by Turnstile in a beforeValidate hook,
 * authenticated read. No custom endpoint needed - the standard Payload REST
 * create is the RSVP API.
 *
 * PII: attendee name/email/phone for HIV-services events is sensitive. Per the
 * SHU-1017 build contract, NEVER console.log field values here.
 */

async function verifyTurnstile(token: string, secret: string): Promise<boolean> {
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ secret, response: token }),
  });
  const data = (await res.json()) as { success?: boolean };
  return data.success === true;
}

export const EventRegistrations: CollectionConfig = {
  slug: 'event-registrations',
  admin: {
    useAsTitle: 'attendeeName',
    defaultColumns: ['attendeeName', 'event', 'status', 'guests', 'createdAt'],
    description: 'People who registered for an event. Export or email attendees from here.',
    group: 'Events',
  },
  access: {
    // Public create: this IS the RSVP endpoint. Turnstile + capacity checks below.
    create: () => true,
    read: ({ req: { user } }) => !!user,
    update: ({ req: { user } }) => !!user,
    delete: ({ req: { user } }) => !!user,
  },
  hooks: {
    beforeValidate: [
      async ({ data, req, operation }) => {
        if (operation !== 'create') return data;
        // Authenticated staff adding a walk-in by hand skip the challenge.
        if (req.user) {
          const { turnstileToken: _drop, ...rest } = (data as any) ?? {};
          return rest;
        }

        const secret = process.env.TURNSTILE_SECRET_KEY;
        // No-op if Turnstile is not configured (safe rollout) - matches
        // ContactSubmissions.
        if (!secret) return data;

        const token = (data as any)?.turnstileToken;
        if (!token) throw new Error('Verification required.');

        const valid = await verifyTurnstile(token, secret);
        if (!valid) throw new Error('Verification failed. Please try again.');

        const { turnstileToken: _, ...rest } = data as any;
        return rest;
      },
    ],
    beforeChange: [
      async ({ data, req, operation }) => {
        if (operation !== 'create') return data;

        const eventId = typeof data.event === 'object' ? data.event?.id : data.event;
        if (!eventId) throw new Error('An event is required.');

        const event = await req.payload.findByID({
          collection: 'events',
          id: eventId,
          depth: 0,
          overrideAccess: true,
        });

        if (!req.user) {
          if (event.status !== 'published') throw new Error('Registration is not open for this event.');
          if (event.registration?.enabled !== true) throw new Error('This event does not accept registrations.');

          const closesAt = event.registration?.closesAt
            ? new Date(event.registration.closesAt)
            : new Date(event.startDate);
          if (Date.now() > closesAt.getTime()) throw new Error('Registration for this event has closed.');
        }

        const seats = 1 + (Number(data.guests) || 0);
        const capacity = Number(event.registration?.capacity) || 0;

        // Capacity 0 = unlimited. Otherwise count confirmed seats already taken.
        if (capacity > 0) {
          const { docs: taken } = await req.payload.find({
            collection: 'event-registrations',
            where: { event: { equals: eventId }, status: { in: ['confirmed', 'pending-payment'] } },
            limit: 1000,
            depth: 0,
            overrideAccess: true,
          });
          const used = taken.reduce((sum: number, r: any) => sum + 1 + (Number(r.guests) || 0), 0);

          if (used + seats > capacity) {
            if (event.registration?.waitlistEnabled) {
              data.status = 'waitlisted';
            } else {
              throw new Error('This event is full.');
            }
          }
        }

        // Paid events park in pending-payment until the Stripe webhook confirms.
        if (data.status !== 'waitlisted') {
          data.status = event.registration?.priceCents > 0 ? 'pending-payment' : 'confirmed';
        }

        return data;
      },
    ],
    afterChange: [
      async ({ doc, operation, req }) => {
        if (operation !== 'create') return doc;
        // Paid registrations get their confirmation from the Stripe webhook,
        // not here - otherwise we confirm a seat nobody paid for.
        if (doc.status === 'pending-payment') return doc;
        if (!isEmailConfigured()) {
          console.warn('[EventRegistrations] RESEND_API_KEY unset - no confirmation sent');
          return doc;
        }

        try {
          const eventId = typeof doc.event === 'object' ? doc.event.id : doc.event;
          const event = await req.payload.findByID({ collection: 'events', id: eventId, depth: 0, overrideAccess: true });

          await sendRsvpConfirmation(req.payload, {
            to: doc.attendeeEmail,
            attendeeName: doc.attendeeName,
            eventTitle: event.title,
            eventStart: event.startDate,
            locationText:
              event.location?.type === 'virtual'
                ? 'Virtual event - link in your confirmation'
                : [event.location?.venueName, event.location?.city].filter(Boolean).join(', ') || 'TBA',
            eventSlug: event.slug,
            eventId: event.id,
            note: event.registration?.confirmationNote || undefined,
            waitlisted: doc.status === 'waitlisted',
            guests: doc.guests,
          });

          await notifyStaffOfRsvp(req.payload, event.title, doc.id, doc.status === 'waitlisted');
        } catch (err) {
          // Never fail the registration because mail failed - the seat is real.
          console.error(`[EventRegistrations] notification failed for #${doc.id}:`, (err as Error).message);
        }

        return doc;
      },
    ],
  },
  fields: [
    { name: 'event', type: 'relationship', relationTo: 'events', required: true, index: true },
    { name: 'attendeeName', type: 'text', required: true },
    { name: 'attendeeEmail', type: 'email', required: true, index: true },
    { name: 'attendeePhone', type: 'text' },
    {
      name: 'guests',
      type: 'number',
      defaultValue: 0,
      min: 0,
      max: 10,
      admin: { description: 'Additional people attending with this registrant.' },
    },
    {
      name: 'accessibilityNeeds',
      type: 'textarea',
      admin: { description: 'Accommodations requested (interpretation, mobility, dietary).' },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'confirmed',
      options: [
        { label: 'Confirmed', value: 'confirmed' },
        { label: 'Pending payment', value: 'pending-payment' },
        { label: 'Waitlisted', value: 'waitlisted' },
        { label: 'Cancelled', value: 'cancelled' },
        { label: 'Attended', value: 'attended' },
        { label: 'No-show', value: 'no-show' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'payment',
      type: 'group',
      admin: { condition: (data) => data?.status === 'pending-payment' || !!data?.payment?.stripeSessionId },
      fields: [
        { name: 'stripeSessionId', type: 'text', admin: { readOnly: true } },
        { name: 'stripePaymentIntentId', type: 'text', admin: { readOnly: true } },
        { name: 'amountCents', type: 'number', admin: { readOnly: true } },
        { name: 'paidAt', type: 'date', admin: { readOnly: true } },
      ],
    },
    {
      name: 'consentToContact',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'Registrant agreed to be contacted about this event.' },
    },
    {
      name: 'turnstileToken',
      type: 'text',
      virtual: true,
      admin: { hidden: true, description: 'Stripped before save. Never persisted.' },
    },
    { name: 'internalNotes', type: 'textarea', admin: { position: 'sidebar' } },
  ],
};
