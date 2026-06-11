import { CollectionConfig } from 'payload';

/**
 * Options for the "service providers you've received services from" checklist
 * on the Planning Council membership form. This is a CURATED list maintained by
 * staff — intentionally separate from the public `providers` directory, which
 * uses different names/scope. The two "No / I don't know" answer choices are
 * fixed in the frontend, not stored here.
 */
export const ServiceProviderOptions: CollectionConfig = {
  slug: 'service-provider-options',
  admin: {
    useAsTitle: 'label',
    defaultColumns: ['label', 'order', 'active'],
    description: 'Provider options shown on the membership form (Step 3). Edit here to update the form.',
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
      admin: { description: 'Exact text shown (and saved) for this provider option.' },
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
