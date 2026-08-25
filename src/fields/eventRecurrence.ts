import type { Field } from 'payload';

/**
 * EV2-01 — Recurring event support.
 *
 * Change Order #1 listed "simple recurring event support (optional)" under the
 * EV001 MVP backend. It was never built. This is the field group; spread it
 * into `Events.ts` `fields` (see docs/specs/SHU-EV2-events-v2-scaffold.md).
 *
 * Design note: we store the RULE, not expanded instances. Expanding 52 weekly
 * Planning Council meetings into 52 rows would wreck the admin list view Terri
 * actually uses, and every edit would need a fan-out. The frontend and the .ics
 * feed expand on read instead.
 */

export const RECURRENCE_FREQUENCIES = ['none', 'daily', 'weekly', 'monthly'] as const;
export type RecurrenceFrequency = (typeof RECURRENCE_FREQUENCIES)[number];

const WEEKDAYS = [
  { label: 'Sunday', value: 'SU' },
  { label: 'Monday', value: 'MO' },
  { label: 'Tuesday', value: 'TU' },
  { label: 'Wednesday', value: 'WE' },
  { label: 'Thursday', value: 'TH' },
  { label: 'Friday', value: 'FR' },
  { label: 'Saturday', value: 'SA' },
];

const isRecurring = (data: any) =>
  !!data?.recurrence?.frequency && data.recurrence.frequency !== 'none';

export const eventRecurrenceFields: Field[] = [
  {
    name: 'recurrence',
    type: 'group',
    admin: {
      description:
        'Leave frequency as "Does not repeat" for one-off events. Recurring events stay a single entry; the website and calendar feed expand them automatically.',
    },
    fields: [
      {
        name: 'frequency',
        type: 'select',
        required: true,
        defaultValue: 'none',
        options: [
          { label: 'Does not repeat', value: 'none' },
          { label: 'Daily', value: 'daily' },
          { label: 'Weekly', value: 'weekly' },
          { label: 'Monthly', value: 'monthly' },
        ],
      },
      {
        name: 'interval',
        type: 'number',
        defaultValue: 1,
        min: 1,
        max: 52,
        admin: {
          description: 'Repeat every N days/weeks/months. 1 = every time.',
          condition: (data) => isRecurring(data),
        },
      },
      {
        name: 'byWeekday',
        type: 'select',
        hasMany: true,
        options: WEEKDAYS,
        admin: {
          description: 'Which days of the week. Defaults to the start date’s weekday.',
          condition: (data) => data?.recurrence?.frequency === 'weekly',
        },
      },
      {
        name: 'monthlyMode',
        type: 'select',
        defaultValue: 'dayOfMonth',
        options: [
          { label: 'Same date each month (e.g. the 6th)', value: 'dayOfMonth' },
          { label: 'Same weekday position (e.g. 1st Tuesday)', value: 'nthWeekday' },
        ],
        admin: { condition: (data) => data?.recurrence?.frequency === 'monthly' },
      },
      {
        name: 'endMode',
        type: 'select',
        defaultValue: 'until',
        options: [
          { label: 'Repeat until a date', value: 'until' },
          { label: 'Repeat a set number of times', value: 'count' },
        ],
        admin: { condition: (data) => isRecurring(data) },
      },
      {
        name: 'until',
        type: 'date',
        admin: {
          description: 'Last date the series can occur. Required — open-ended series break the calendar feed.',
          date: { pickerAppearance: 'dayOnly' },
          condition: (data) => isRecurring(data) && data?.recurrence?.endMode === 'until',
        },
      },
      {
        name: 'count',
        type: 'number',
        min: 2,
        max: 200,
        admin: { condition: (data) => isRecurring(data) && data?.recurrence?.endMode === 'count' },
      },
      {
        name: 'exceptions',
        type: 'array',
        labels: { singular: 'Skipped date', plural: 'Skipped dates' },
        admin: {
          description: 'Cancel individual occurrences (holidays, snow days) without breaking the series.',
          condition: (data) => isRecurring(data),
        },
        fields: [
          { name: 'date', type: 'date', required: true, admin: { date: { pickerAppearance: 'dayOnly' } } },
          { name: 'reason', type: 'text' },
        ],
      },
      {
        name: 'rrule',
        type: 'text',
        admin: {
          readOnly: true,
          description: 'Generated RFC 5545 rule. Consumed by the .ics feed and the website calendar.',
          condition: (data) => isRecurring(data),
        },
      },
    ],
  },
];

/**
 * Build an RFC 5545 RRULE string from the field group above.
 * Returns null for non-recurring events. Pure — safe on Workers.
 */
export function buildRRule(recurrence: any, startDate?: string | Date | null): string | null {
  if (!recurrence || !recurrence.frequency || recurrence.frequency === 'none') return null;

  const parts: string[] = [`FREQ=${String(recurrence.frequency).toUpperCase()}`];

  const interval = Number(recurrence.interval) || 1;
  if (interval > 1) parts.push(`INTERVAL=${interval}`);

  if (recurrence.frequency === 'weekly') {
    const days: string[] = Array.isArray(recurrence.byWeekday) ? recurrence.byWeekday : [];
    if (days.length) {
      parts.push(`BYDAY=${days.join(',')}`);
    } else if (startDate) {
      const codes = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
      parts.push(`BYDAY=${codes[new Date(startDate).getUTCDay()]}`);
    }
  }

  if (recurrence.frequency === 'monthly' && recurrence.monthlyMode === 'nthWeekday' && startDate) {
    const d = new Date(startDate);
    const codes = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
    const nth = Math.ceil(d.getUTCDate() / 7);
    parts.push(`BYDAY=${nth}${codes[d.getUTCDay()]}`);
  }

  if (recurrence.endMode === 'count' && recurrence.count) {
    parts.push(`COUNT=${Number(recurrence.count)}`);
  } else if (recurrence.until) {
    const u = new Date(recurrence.until);
    const pad = (n: number) => String(n).padStart(2, '0');
    parts.push(
      `UNTIL=${u.getUTCFullYear()}${pad(u.getUTCMonth() + 1)}${pad(u.getUTCDate())}T235959Z`,
    );
  }

  return parts.join(';');
}

/**
 * beforeChange hook — keeps `recurrence.rrule` in sync. Add to Events.hooks.beforeChange.
 */
export const syncRRuleHook = async ({ data }: { data: any }) => {
  if (data?.recurrence) {
    data.recurrence.rrule = buildRRule(data.recurrence, data.startDate) ?? '';
  }
  return data;
};
