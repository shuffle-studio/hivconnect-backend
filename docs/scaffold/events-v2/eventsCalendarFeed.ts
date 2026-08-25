import type { Endpoint, PayloadRequest } from 'payload';
import { buildCalendar, googleCalendarUrl, type IcsEvent } from '../lib/ics';

/**
 * EV2-02 - public calendar feed endpoints.
 *
 * Wire into Events.endpoints (see docs/specs/SHU-EV2-events-v2-scaffold.md):
 *   GET /api/events/calendar.ics      → whole published calendar (subscribable)
 *   GET /api/events/:id/event.ics     → one event
 *   GET /api/events/:id/google        → 302 to Google's "add event" template
 *
 * These are PUBLIC and unauthenticated by design - a calendar feed nobody can
 * subscribe to without credentials is not a calendar feed. Access is still
 * scoped to `status: published`, matching Events.access.read for anonymous
 * users, so drafts never leak.
 */

const SITE_URL = 'https://hivconnectcentralnj.com';
const ORG_NAME = 'HIV Connect Central NJ';

const CATEGORY_LABELS: Record<string, string> = {
  'planning-council': 'Planning Council Meeting',
  committee: 'Committee Meeting',
  community: 'Community Event',
  training: 'Training/Workshop',
  'health-fair': 'Health Fair',
  'support-group': 'Support Group',
  other: 'Event',
};

function locationString(doc: any): string {
  const loc = doc.location ?? {};
  if (loc.type === 'virtual') return loc.virtualLink || 'Virtual Event';
  const parts = [loc.venueName, loc.address, loc.city && loc.state ? `${loc.city}, ${loc.state}` : null, loc.zipCode];
  const inPerson = parts.filter(Boolean).join(', ');
  if (loc.type === 'hybrid' && loc.virtualLink) return `${inPerson} (also virtual: ${loc.virtualLink})`;
  return inPerson || 'Location TBA';
}

/** Lexical rich text → plain text. Calendar clients render TEXT, not HTML. */
function lexicalToPlain(node: any): string {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(lexicalToPlain).join('');
  if (node.text) return node.text;
  const children = node.children ?? node.root?.children;
  if (Array.isArray(children)) {
    return children.map(lexicalToPlain).join(node.type === 'paragraph' ? '\n' : '');
  }
  return '';
}

export function toIcsEvent(doc: any): IcsEvent {
  const description = [
    lexicalToPlain(doc.description).trim(),
    '',
    `Category: ${CATEGORY_LABELS[doc.category] ?? doc.category}`,
    doc.contactEmail ? `Contact: ${doc.contactEmail}` : null,
    doc.rsvpLink ? `RSVP: ${doc.rsvpLink}` : null,
    `Details: ${SITE_URL}/events/${doc.slug}`,
  ]
    .filter((l) => l !== null)
    .join('\n')
    .trim();

  return {
    // Stable across edits and globally unique - clients key updates off UID.
    uid: `event-${doc.id}@hivconnectcentralnj.com`,
    title: doc.title,
    description,
    start: doc.startDate,
    end: doc.endDate,
    location: locationString(doc),
    url: `${SITE_URL}/events/${doc.slug}`,
    organizerName: ORG_NAME,
    organizerEmail: doc.contactEmail || undefined,
    rrule: doc.recurrence?.rrule || null,
    exceptions: (doc.recurrence?.exceptions ?? []).map((e: any) => e.date).filter(Boolean),
    status: doc.status === 'cancelled' ? 'CANCELLED' : 'CONFIRMED',
    lastModified: doc.updatedAt,
  };
}

function icsResponse(body: string, filename: string): Response {
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `inline; filename="${filename}"`,
      // Short cache: Terri edits events and expects to see them. Cloudflare
      // will still collapse the origin hits.
      'Cache-Control': 'public, max-age=900, s-maxage=900',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

export const eventsCalendarFeed: Endpoint = {
  path: '/calendar.ics',
  method: 'get',
  handler: async (req: PayloadRequest) => {
    const { docs } = await req.payload.find({
      collection: 'events',
      where: { status: { equals: 'published' } },
      limit: 500,
      sort: 'startDate',
      depth: 0,
      overrideAccess: true,
    });

    const body = buildCalendar(docs.map(toIcsEvent), `${ORG_NAME} - Events & Calendar`);
    return icsResponse(body, 'hiv-connect-central-nj.ics');
  },
};

export const singleEventIcs: Endpoint = {
  path: '/:id/event.ics',
  method: 'get',
  handler: async (req: PayloadRequest) => {
    const id = req.routeParams?.id as string;

    let doc: any;
    try {
      doc = await req.payload.findByID({ collection: 'events', id, depth: 0, overrideAccess: true });
    } catch {
      return new Response('Not found', { status: 404 });
    }

    // Anonymous callers only ever see published events. Mirrors Events.access.read.
    if (!req.user && doc.status !== 'published') {
      return new Response('Not found', { status: 404 });
    }

    const body = buildCalendar([toIcsEvent(doc)], doc.title);
    return icsResponse(body, `${doc.slug || 'event'}.ics`);
  },
};

export const googleCalendarRedirect: Endpoint = {
  path: '/:id/google',
  method: 'get',
  handler: async (req: PayloadRequest) => {
    const id = req.routeParams?.id as string;

    let doc: any;
    try {
      doc = await req.payload.findByID({ collection: 'events', id, depth: 0, overrideAccess: true });
    } catch {
      return new Response('Not found', { status: 404 });
    }

    if (!req.user && doc.status !== 'published') {
      return new Response('Not found', { status: 404 });
    }

    return Response.redirect(googleCalendarUrl(toIcsEvent(doc)), 302);
  },
};

export const eventCalendarEndpoints: Endpoint[] = [
  eventsCalendarFeed,
  singleEventIcs,
  googleCalendarRedirect,
];
