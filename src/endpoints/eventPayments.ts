import type { Endpoint, PayloadRequest } from 'payload';
import { createEventCheckoutSession, isStripeConfigured, verifyStripeWebhook } from '../lib/stripe';
import { sendRsvpConfirmation, notifyStaffOfRsvp, isEmailConfigured } from '../lib/eventNotifications';

/**
 * EV2-06 — paid-event endpoints.
 *
 *   POST /api/event-registrations/:id/checkout   → { url } for Stripe Checkout
 *   POST /api/stripe/events-webhook              → confirms the seat
 *
 * Scope note for the SOW: most Planning Council events are free. This exists
 * for trainings and the health-fair vendor tables. Do not price this as a
 * storefront.
 */

const SITE_URL = 'https://hivconnectcentralnj.com';

export const createCheckout: Endpoint = {
  path: '/:id/checkout',
  method: 'post',
  handler: async (req: PayloadRequest) => {
    if (!isStripeConfigured()) {
      return Response.json({ error: 'Payments are not configured.' }, { status: 503 });
    }

    const id = req.routeParams?.id as string;

    let registration: any;
    try {
      registration = await req.payload.findByID({
        collection: 'event-registrations',
        id,
        depth: 0,
        overrideAccess: true,
      });
    } catch {
      return Response.json({ error: 'Registration not found.' }, { status: 404 });
    }

    if (registration.status !== 'pending-payment') {
      return Response.json({ error: 'This registration does not require payment.' }, { status: 400 });
    }

    // Reuse an unexpired session rather than minting a second one — a donor who
    // hits back and retries should land on the same checkout.
    if (registration.payment?.stripeSessionId) {
      return Response.json({ error: 'A checkout is already in progress.', sessionId: registration.payment.stripeSessionId }, { status: 409 });
    }

    const event = await req.payload.findByID({
      collection: 'events',
      id: typeof registration.event === 'object' ? registration.event.id : registration.event,
      depth: 0,
      overrideAccess: true,
    });

    const amountCents = Number(event.registration?.priceCents) || 0;
    if (amountCents <= 0) {
      return Response.json({ error: 'This event is free.' }, { status: 400 });
    }

    const quantity = 1 + (Number(registration.guests) || 0);

    try {
      const session = await createEventCheckoutSession({
        registrationId: registration.id,
        eventId: event.id,
        eventTitle: event.title,
        amountCents,
        quantity,
        attendeeEmail: registration.attendeeEmail,
        successUrl: `${SITE_URL}/events/${event.slug}?registered=1`,
        cancelUrl: `${SITE_URL}/events/${event.slug}?cancelled=1`,
      });

      await req.payload.update({
        collection: 'event-registrations',
        id: registration.id,
        data: { payment: { ...registration.payment, stripeSessionId: session.id, amountCents: amountCents * quantity } },
        overrideAccess: true,
      });

      return Response.json({ url: session.url, sessionId: session.id });
    } catch (err) {
      console.error('[eventPayments] checkout failed:', (err as Error).message);
      return Response.json({ error: 'Could not start checkout.' }, { status: 502 });
    }
  },
};

/**
 * Root-level endpoint (registered on payload.config `endpoints`, not on a
 * collection) so the path Stripe posts to stays stable and readable.
 *
 * MUST read the raw body — Payload's JSON parsing would break the signature.
 */
export const stripeEventsWebhook: Endpoint = {
  path: '/stripe/events-webhook',
  method: 'post',
  handler: async (req: PayloadRequest) => {
    const signature = req.headers.get('stripe-signature');
    if (!signature) return new Response('Missing signature', { status: 400 });

    let rawBody: string;
    try {
      rawBody = await (req as any).text();
    } catch {
      return new Response('Unreadable body', { status: 400 });
    }

    let event;
    try {
      event = await verifyStripeWebhook(rawBody, signature);
    } catch (err) {
      // Never echo the reason — a verification oracle helps only an attacker.
      console.warn('[stripe-webhook] signature verification failed');
      return new Response('Invalid signature', { status: 400 });
    }

    if (event.type !== 'checkout.session.completed') {
      // 200 on everything else: Stripe retries non-2xx for days.
      return Response.json({ received: true, ignored: event.type });
    }

    const session = event.data.object as any;
    const registrationId = session.metadata?.registrationId;
    if (!registrationId) return Response.json({ received: true, ignored: 'no registrationId' });

    try {
      const registration = await req.payload.findByID({
        collection: 'event-registrations',
        id: registrationId,
        depth: 0,
        overrideAccess: true,
      });

      // Idempotency: Stripe delivers the same event more than once.
      if (registration.status === 'confirmed') {
        return Response.json({ received: true, alreadyConfirmed: true });
      }

      await req.payload.update({
        collection: 'event-registrations',
        id: registrationId,
        data: {
          status: 'confirmed',
          payment: {
            ...registration.payment,
            stripePaymentIntentId: session.payment_intent,
            amountCents: session.amount_total,
            paidAt: new Date().toISOString(),
          },
        },
        overrideAccess: true,
      });

      const evt = await req.payload.findByID({
        collection: 'events',
        id: typeof registration.event === 'object' ? registration.event.id : registration.event,
        depth: 0,
        overrideAccess: true,
      });

      if (isEmailConfigured()) {
        await sendRsvpConfirmation(req.payload, {
          to: registration.attendeeEmail,
          attendeeName: registration.attendeeName,
          eventTitle: evt.title,
          eventStart: evt.startDate,
          locationText:
            evt.location?.type === 'virtual'
              ? 'Virtual event — link in your confirmation'
              : [evt.location?.venueName, evt.location?.city].filter(Boolean).join(', ') || 'TBA',
          eventSlug: evt.slug,
          eventId: evt.id,
          note: evt.registration?.confirmationNote || undefined,
          guests: registration.guests,
        });
        await notifyStaffOfRsvp(req.payload, evt.title, registration.id, false);
      }

      console.log(`[stripe-webhook] confirmed registration #${registrationId}`);
      return Response.json({ received: true });
    } catch (err) {
      console.error('[stripe-webhook] processing failed:', (err as Error).message);
      // 500 → Stripe retries. The payment succeeded; we want another attempt.
      return new Response('Processing failed', { status: 500 });
    }
  },
};
