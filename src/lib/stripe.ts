/**
 * EV2-06 — Stripe on Cloudflare Workers.
 *
 * Change Order #1 deferred "Payment processing" to 2026.
 *
 * PORTABILITY WARNING — read before copying from shuffle-studio.
 * `shuffle/shuffle-studio/src/lib/stripe.ts` does `new Stripe(key)` with the
 * SDK's default HTTP client. That client is built on node:http and node:crypto.
 * It works there because shuffle-studio runs Payload on Node (Postgres,
 * standalone Next). THIS app runs on Cloudflare Workers via OpenNext, where
 * that client throws at runtime — usually as an opaque 500 on first charge,
 * i.e. in front of a real donor.
 *
 * Two required differences on Workers:
 *   1. httpClient: Stripe.createFetchHttpClient()
 *   2. webhook verification MUST use constructEventAsync() — the sync variant
 *      needs node crypto.
 *
 * Secrets (wrangler secret put):
 *   STRIPE_SECRET_KEY
 *   STRIPE_WEBHOOK_SECRET
 */

import Stripe from 'stripe';

let _stripe: Stripe | null = null;

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY is not set');

    _stripe = new Stripe(key, {
      // The whole point of this file.
      httpClient: Stripe.createFetchHttpClient(),
      // Workers have no persistent process; retries here are cheap insurance
      // against a cold-start network blip.
      maxNetworkRetries: 2,
      appInfo: { name: 'hivconnect-backend', url: 'https://hivconnectcentralnj.com' },
    });
  }
  return _stripe;
}

export interface EventCheckoutInput {
  registrationId: string | number;
  eventId: string | number;
  eventTitle: string;
  amountCents: number;
  quantity: number;
  attendeeEmail: string;
  successUrl: string;
  cancelUrl: string;
}

export async function createEventCheckoutSession(input: EventCheckoutInput) {
  const stripe = getStripe();

  return stripe.checkout.sessions.create(
    {
      mode: 'payment',
      customer_email: input.attendeeEmail,
      line_items: [
        {
          quantity: input.quantity,
          price_data: {
            currency: 'usd',
            unit_amount: input.amountCents,
            product_data: { name: input.eventTitle },
          },
        },
      ],
      // The webhook is the only thing that confirms a seat, and it needs to
      // find the registration without trusting anything from the browser.
      metadata: {
        registrationId: String(input.registrationId),
        eventId: String(input.eventId),
      },
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    },
    {
      // Replays of the same registration must not create a second session or
      // double-charge. Workers retry more than you would think.
      idempotencyKey: `evt-reg-${input.registrationId}`,
    },
  );
}

/** Workers-safe webhook verification. constructEvent() (sync) will throw here. */
export async function verifyStripeWebhook(rawBody: string, signature: string): Promise<Stripe.Event> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET is not set');
  return getStripe().webhooks.constructEventAsync(rawBody, signature, secret);
}
