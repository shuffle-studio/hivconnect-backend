import type { Payload } from 'payload';
import { isEmailConfigured } from './email';

/**
 * EV2-03 - event registration email.
 *
 * Sends through this project's own Payload email adapter (Resend - see
 * ./email.ts), NOT through the shared shufflestudio-comms Worker. Each project
 * owns its sender, its domain reputation, and its API key.
 *
 * Supersedes the earlier src/lib/comms.ts scaffold.
 *
 * PII: never log attendee names, addresses or accommodation text.
 * (docs/specs/SHU-1017-build-contract.md)
 */

export { isEmailConfigured };

const SITE_URL = 'https://hivconnectcentralnj.com';
const BACKEND_URL = 'https://login.hivconnectcentralnj.com';
const BRAND = '#1B7FB3';

export interface RsvpConfirmationInput {
  to: string;
  attendeeName?: string;
  eventTitle: string;
  eventStart: string;
  locationText: string;
  eventSlug: string;
  eventId: string | number;
  waitlisted?: boolean;
  guests?: number;
  /** Per-event extra text from Events.registration.confirmationNote. */
  note?: string;
}

const esc = (s: unknown) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

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

function shell(inner: string): string {
  return `<div style="font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif;max-width:560px;color:#1f2937;line-height:1.55">
    ${inner}
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0 16px">
    <p style="color:#6b7280;font-size:13px;margin:0">
      HIV Connect Central NJ<br>
      Need to cancel or change your registration? Reply to this email and we'll take care of it.
    </p>
  </div>`;
}

/** Confirmation (or waitlist notice) to the person who registered. */
export async function sendRsvpConfirmation(
  payload: Payload,
  input: RsvpConfirmationInput,
): Promise<void> {
  const eventUrl = `${SITE_URL}/events/${input.eventSlug}`;
  const icsUrl = `${BACKEND_URL}/api/events/${input.eventId}/event.ics`;

  const subject = input.waitlisted
    ? `You're on the waitlist: ${input.eventTitle}`
    : `You're registered: ${input.eventTitle}`;

  const lead = input.waitlisted
    ? `This event is currently full, so we've added you to the waitlist. We'll email you as soon as a spot opens up.`
    : `You're all set. Here are the details:`;

  const html = shell(`
    <h2 style="color:${BRAND};margin:0 0 16px;font-size:22px">${esc(input.eventTitle)}</h2>
    <p style="margin:0 0 12px">${input.attendeeName ? `Hi ${esc(input.attendeeName)},` : 'Hello,'}</p>
    <p style="margin:0 0 16px">${lead}</p>
    <table style="border-collapse:collapse;margin:0 0 20px">
      <tr>
        <td style="padding:4px 14px 4px 0;color:#6b7280;vertical-align:top">When</td>
        <td style="padding:4px 0"><strong>${esc(formatEastern(input.eventStart))}</strong> (Eastern)</td>
      </tr>
      <tr>
        <td style="padding:4px 14px 4px 0;color:#6b7280;vertical-align:top">Where</td>
        <td style="padding:4px 0">${esc(input.locationText)}</td>
      </tr>
      ${
        input.guests
          ? `<tr><td style="padding:4px 14px 4px 0;color:#6b7280">Guests</td><td style="padding:4px 0">${Number(input.guests)}</td></tr>`
          : ''
      }
    </table>
    ${input.note ? `<p style="margin:0 0 20px;padding:12px 14px;background:#f3f7fa;border-left:3px solid ${BRAND}">${esc(input.note)}</p>` : ''}
    ${
      input.waitlisted
        ? ''
        : `<p style="margin:0 0 14px"><a href="${esc(icsUrl)}" style="background:${BRAND};color:#fff;padding:11px 20px;border-radius:6px;text-decoration:none;display:inline-block;font-weight:600">Add to your calendar</a></p>`
    }
    <p style="margin:0"><a href="${esc(eventUrl)}" style="color:${BRAND}">View event details</a></p>
  `);

  const text = [
    input.eventTitle,
    '',
    input.waitlisted ? 'You are on the waitlist for this event.' : 'You are registered for this event.',
    `When: ${formatEastern(input.eventStart)} (Eastern)`,
    `Where: ${input.locationText}`,
    input.note ? `\n${input.note}` : '',
    '',
    `Details: ${eventUrl}`,
    input.waitlisted ? '' : `Add to calendar: ${icsUrl}`,
  ]
    .filter(Boolean)
    .join('\n');

  await payload.sendEmail({ to: input.to, subject, html, text });
}

/**
 * Internal heads-up to staff.
 * Carries a record ID and a CMS link only - never attendee details, so the
 * notification itself is not a PII surface sitting in an inbox.
 */
export async function notifyStaffOfRsvp(
  payload: Payload,
  eventTitle: string,
  registrationId: string | number,
  waitlisted: boolean,
): Promise<void> {
  const to = process.env.EVENTS_NOTIFY_TO;
  if (!to) return;

  await payload.sendEmail({
    to,
    subject: `New ${waitlisted ? 'waitlist entry' : 'registration'}: ${eventTitle}`,
    html: shell(`
      <p style="margin:0 0 12px">Registration <strong>#${esc(registrationId)}</strong> for
      <strong>${esc(eventTitle)}</strong>${waitlisted ? ' (waitlisted)' : ''}.</p>
      <p style="margin:0 0 12px"><a href="${BACKEND_URL}/admin/collections/event-registrations/${esc(registrationId)}" style="color:${BRAND}">Open in the CMS</a></p>
      <p style="color:#6b7280;font-size:13px;margin:0">Attendee details are intentionally not included in this email.</p>
    `),
  });
}
