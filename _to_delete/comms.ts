/**
 * EV2-03 — outbound notifications.
 *
 * Change Order #1 deferred "Email notifications/confirmations" to 2026.
 *
 * Deliberately NOT a new email adapter. `shufflestudio-comms` already runs at
 * comms.shufflestudio.io (Cloudflare Worker → Microsoft Graph, SHU-855) and
 * gives us a real Sent folder plus a calendar-invite route. Standing up a
 * second sender for this one site would mean a second domain to warm, a second
 * set of SPF/DKIM records, and a second thing to page someone about.
 *
 * NOTE: `payload.config.ts` has no `email:` adapter at all today, so Payload's
 * own transactional mail (password reset, verification) is also dead. That is a
 * separate v1 defect — see the scaffold spec.
 *
 * Secrets (via `wrangler secret put`):
 *   COMMS_URL            https://comms.shufflestudio.io
 *   COMMS_AUTH_SECRET    shared secret, sent as x-comms-secret
 */

const DEFAULT_COMMS_URL = 'https://comms.shufflestudio.io';

export function isCommsConfigured(): boolean {
  return Boolean(process.env.COMMS_AUTH_SECRET);
}

async function commsPost(path: string, body: Record<string, unknown>): Promise<Response> {
  const base = process.env.COMMS_URL || DEFAULT_COMMS_URL;
  const secret = process.env.COMMS_AUTH_SECRET;
  if (!secret) throw new Error('COMMS_AUTH_SECRET is not set');

  return fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-comms-secret': secret },
    body: JSON.stringify(body),
  });
}

export interface RsvpConfirmationInput {
  to: string;
  attendeeName?: string;
  eventTitle: string;
  eventStart: string;
  eventEnd?: string | null;
  locationText: string;
  eventUrl: string;
  icsUrl: string;
  waitlisted?: boolean;
  guests?: number;
}

function formatEastern(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    timeZone: 'America/New_York',
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const esc = (s: string) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Confirmation (or waitlist) email to the attendee.
 *
 * PII: this collection holds names and emails of people registering for HIV
 * services events. Per the SHU-1017 build contract, never log field values —
 * log the registration id and outcome only.
 */
export async function sendRsvpConfirmation(input: RsvpConfirmationInput): Promise<void> {
  const greeting = input.attendeeName ? `Hi ${esc(input.attendeeName)},` : 'Hello,';

  const subject = input.waitlisted
    ? `You're on the waitlist: ${input.eventTitle}`
    : `You're registered: ${input.eventTitle}`;

  const lead = input.waitlisted
    ? `This event is currently full, so you've been added to the waitlist. We'll email you as soon as a spot opens up.`
    : `You're all set. Here are the details:`;

  const html = `
    <div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;max-width:560px;color:#1f2937">
      <h2 style="color:#1B7FB3;margin:0 0 16px">${esc(input.eventTitle)}</h2>
      <p>${greeting}</p>
      <p>${lead}</p>
      <table style="border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:4px 12px 4px 0;color:#6b7280">When</td><td><strong>${esc(formatEastern(input.eventStart))}</strong> (Eastern)</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Where</td><td>${esc(input.locationText)}</td></tr>
        ${input.guests && input.guests > 0 ? `<tr><td style="padding:4px 12px 4px 0;color:#6b7280">Guests</td><td>${input.guests}</td></tr>` : ''}
      </table>
      ${
        input.waitlisted
          ? ''
          : `<p><a href="${esc(input.icsUrl)}" style="background:#1B7FB3;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;display:inline-block">Add to your calendar</a></p>`
      }
      <p><a href="${esc(input.eventUrl)}" style="color:#1B7FB3">View event details</a></p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
      <p style="color:#6b7280;font-size:13px">HIV Connect Central NJ<br>
      Need to cancel or change your registration? Just reply to this email.</p>
    </div>`;

  const res = await commsPost('/email/send', { to: input.to, subject, html });
  if (!res.ok) {
    throw new Error(`comms /email/send failed (${res.status}): ${await res.text().catch(() => '')}`);
  }
}

/** Internal heads-up to staff that someone registered. */
export async function notifyStaffOfRsvp(eventTitle: string, registrationId: string | number, waitlisted: boolean): Promise<void> {
  const to = process.env.EVENTS_NOTIFY_TO;
  if (!to) return;

  const res = await commsPost('/email/send', {
    to,
    subject: `New ${waitlisted ? 'waitlist entry' : 'registration'}: ${eventTitle}`,
    html: `<p>Registration <strong>#${registrationId}</strong> for <strong>${esc(eventTitle)}</strong>${waitlisted ? ' (waitlisted)' : ''}.</p>
           <p><a href="https://login.hivconnectcentralnj.com/admin/collections/event-registrations/${registrationId}">Open in the CMS</a></p>
           <p style="color:#6b7280;font-size:13px">Attendee details are intentionally not included in this email.</p>`,
  });
  if (!res.ok) throw new Error(`comms staff notify failed (${res.status})`);
}
