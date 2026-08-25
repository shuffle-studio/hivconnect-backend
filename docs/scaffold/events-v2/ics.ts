/**
 * EV2-02 — iCalendar (RFC 5545) generation.
 *
 * Change Order #1 deferred "Advanced calendar integrations (Google Calendar,
 * iCal)" to 2026. This is that.
 *
 * Workers constraints (per docs/specs/SHU-1017-build-contract.md): pure JS, no
 * node:*, no native modules. Nothing here imports anything.
 *
 * Why hand-rolled instead of the `ics` npm package: that package pulls in
 * node Buffer paths and is heavier than the ~120 lines it replaces. The RFC
 * surface we need (VEVENT, RRULE, EXDATE, folding, escaping) is small.
 */

export interface IcsEvent {
  uid: string;
  title: string;
  description?: string;
  start: string | Date;
  end?: string | Date | null;
  location?: string;
  url?: string;
  organizerName?: string;
  organizerEmail?: string;
  /** RFC 5545 rule, e.g. "FREQ=MONTHLY;BYDAY=1TU". From buildRRule(). */
  rrule?: string | null;
  /** Dates to skip within a series. */
  exceptions?: (string | Date)[];
  status?: 'CONFIRMED' | 'CANCELLED' | 'TENTATIVE';
  lastModified?: string | Date;
}

const PRODID = '-//HIV Connect Central NJ//Events//EN';

/** RFC 5545 §3.3.5 — UTC form. */
export function toIcsUtc(value: string | Date): string {
  const d = value instanceof Date ? value : new Date(value);
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

/** RFC 5545 §3.3.11 — escape TEXT values. Order matters: backslash first. */
export function escapeIcsText(value: string): string {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/**
 * RFC 5545 §3.1 — fold at 75 octets. Google Calendar and Outlook both reject
 * or silently truncate long unfolded lines, which is the usual reason a feed
 * "works in Apple Calendar but not Google".
 */
export function foldLine(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;

  const out: string[] = [];
  let current = '';
  let currentBytes = 0;

  for (const char of line) {
    const size = new TextEncoder().encode(char).length;
    const limit = out.length === 0 ? 75 : 74; // continuation lines carry a leading space
    if (currentBytes + size > limit) {
      out.push(current);
      current = char;
      currentBytes = size;
    } else {
      current += char;
      currentBytes += size;
    }
  }
  if (current) out.push(current);

  return out.map((seg, i) => (i === 0 ? seg : ` ${seg}`)).join('\r\n');
}

function line(name: string, value: string): string {
  return foldLine(`${name}:${value}`);
}

export function buildVEvent(event: IcsEvent): string[] {
  const start = event.start instanceof Date ? event.start : new Date(event.start);
  const end = event.end ? (event.end instanceof Date ? event.end : new Date(event.end)) : null;

  // No end date on the event: default to a 1-hour block. An event with
  // DTSTART and no DTEND is legal but renders as all-day in most clients,
  // which is wrong for a 10:30am meeting.
  const resolvedEnd = end ?? new Date(start.getTime() + 60 * 60 * 1000);

  const lines: string[] = ['BEGIN:VEVENT'];
  lines.push(line('UID', event.uid));
  lines.push(line('DTSTAMP', toIcsUtc(event.lastModified ?? new Date())));
  lines.push(line('DTSTART', toIcsUtc(start)));
  lines.push(line('DTEND', toIcsUtc(resolvedEnd)));
  lines.push(line('SUMMARY', escapeIcsText(event.title)));

  if (event.description) lines.push(line('DESCRIPTION', escapeIcsText(event.description)));
  if (event.location) lines.push(line('LOCATION', escapeIcsText(event.location)));
  if (event.url) lines.push(line('URL', event.url));
  if (event.rrule) lines.push(line('RRULE', event.rrule));

  if (event.exceptions?.length) {
    lines.push(line('EXDATE', event.exceptions.map((d) => toIcsUtc(d)).join(',')));
  }

  if (event.organizerEmail) {
    const cn = event.organizerName ? `;CN=${escapeIcsText(event.organizerName)}` : '';
    lines.push(foldLine(`ORGANIZER${cn}:mailto:${event.organizerEmail}`));
  }

  lines.push(line('STATUS', event.status ?? 'CONFIRMED'));
  lines.push('END:VEVENT');
  return lines;
}

export function buildCalendar(events: IcsEvent[], calendarName = 'HIV Connect Central NJ'): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    line('PRODID', PRODID),
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    line('X-WR-CALNAME', escapeIcsText(calendarName)),
    line('X-WR-TIMEZONE', 'America/New_York'),
    // Tells Google/Outlook how often to re-poll a subscribed feed.
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
    'X-PUBLISHED-TTL:PT1H',
  ];

  for (const event of events) lines.push(...buildVEvent(event));

  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}

/**
 * "Add to Google Calendar" URL. Single occurrence only — Google's template URL
 * has no recurrence parameter, which is why subscribing to the .ics feed is the
 * better path for the Planning Council's standing meetings.
 */
export function googleCalendarUrl(event: IcsEvent): string {
  const start = event.start instanceof Date ? event.start : new Date(event.start);
  const end = event.end
    ? event.end instanceof Date
      ? event.end
      : new Date(event.end)
    : new Date(start.getTime() + 60 * 60 * 1000);

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${toIcsUtc(start)}/${toIcsUtc(end)}`,
  });
  if (event.description) params.set('details', event.description);
  if (event.location) params.set('location', event.location);

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
