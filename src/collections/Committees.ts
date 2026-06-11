import { CollectionConfig } from 'payload';

/**
 * Committee / mailing-list options shown on the membership form (Step 1 —
 * "which mailing lists would you like to join?"). Staff-editable so meeting
 * schedules can change without a code deploy. The `label` is the exact string
 * shown on the form and saved with the application.
 */
export const Committees: CollectionConfig = {
  slug: 'committees',
  admin: {
    useAsTitle: 'label',
    defaultColumns: ['label', 'order', 'active'],
    description: 'Mailing-list / committee options shown on the membership form (Step 1).',
  },
  access: {
    read: () => true, // public — the form reads this
    create: ({ req: { user } }) => !!user,
    update: ({ req: { user } }) => !!user,
    delete: ({ req: { user } }) => !!user,
  },
  defaultSort: 'order',
  fields: [
    {
      name: 'label',
      type: 'text',
      required: true,
      unique: true,
      admin: { description: 'Exact text shown (and saved), e.g. "Planning Council (usually 1st Tuesday of each month 6-8pm)".' },
    },
    {
      name: 'order',
      type: 'number',
      defaultValue: 0,
      admin: { description: 'Display order (lower = first).' },
    },
    {
      name: 'active',
      type: 'checkbox',
      defaultValue: true,
      admin: { description: 'Uncheck to hide from the form without deleting.' },
    },
  ],
}
