import type { Field } from 'payload';

/**
 * EV2-04 — per-event registration settings. Spread into Events.ts `fields`.
 *
 * Kept separate from the Events collection file so the LEAD-owned collection
 * takes a one-line change rather than a 120-line diff.
 */
export const eventRegistrationFields: Field[] = [
  {
    name: 'registration',
    type: 'group',
    admin: {
      description:
        'Turn on to collect RSVPs on the website. Leave off to keep using an external RSVP link.',
    },
    fields: [
      {
        name: 'enabled',
        type: 'checkbox',
        defaultValue: false,
        label: 'Accept registrations on this website',
      },
      {
        name: 'capacity',
        type: 'number',
        min: 0,
        defaultValue: 0,
        admin: {
          description: '0 = unlimited. Counts the registrant plus their guests.',
          condition: (data) => data?.registration?.enabled === true,
        },
      },
      {
        name: 'waitlistEnabled',
        type: 'checkbox',
        defaultValue: true,
        admin: {
          description: 'When full, keep taking names instead of turning people away.',
          condition: (data) => data?.registration?.enabled === true && data?.registration?.capacity > 0,
        },
      },
      {
        name: 'allowGuests',
        type: 'checkbox',
        defaultValue: true,
        admin: { condition: (data) => data?.registration?.enabled === true },
      },
      {
        name: 'closesAt',
        type: 'date',
        admin: {
          description: 'Registration closes at this time. Defaults to the event start.',
          date: { pickerAppearance: 'dayAndTime' },
          condition: (data) => data?.registration?.enabled === true,
        },
      },
      {
        name: 'priceCents',
        type: 'number',
        min: 0,
        defaultValue: 0,
        label: 'Price (in cents)',
        admin: {
          description:
            '0 = free. Anything above 0 routes the registrant through Stripe Checkout before their seat is confirmed. Most Planning Council events should stay 0.',
          condition: (data) => data?.registration?.enabled === true,
        },
      },
      {
        name: 'confirmationNote',
        type: 'textarea',
        admin: {
          description: 'Extra text added to the confirmation email (parking, Zoom link, what to bring).',
          condition: (data) => data?.registration?.enabled === true,
        },
      },
    ],
  },
];
