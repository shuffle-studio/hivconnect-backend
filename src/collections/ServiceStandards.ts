import { CollectionConfig } from 'payload';
import { afterChangeHook, afterDeleteHook } from '../hooks/triggerFrontendRebuild';

export const ServiceStandards: CollectionConfig = {
  slug: 'service-standards',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'category', 'lastUpdated', 'status'],
    description: 'Ryan White Service Standards and quality guidelines',
  },
  hooks: {
    afterChange: [afterChangeHook],
    afterDelete: [afterDeleteHook],
  },
  access: {
    read: ({ req: { user } }) => {
      // Published standards are public
      if (user) return true;
      return {
        status: { equals: 'published' },
      };
    },
    create: ({ req: { user } }) => !!user,
    update: ({ req: { user } }) => !!user,
    delete: ({ req: { user } }) => user?.role === 'admin',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      admin: {
        description: 'Service standard title (e.g., "Core Medical Services Standards")',
      },
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'URL-friendly identifier (auto-generated from title)',
      },
      hooks: {
        beforeValidate: [
          ({ value, data }) => {
            if (data?.title && !value) {
              return data.title
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '');
            }
            return value;
          },
        ],
      },
    },
    {
      name: 'document',
      type: 'upload',
      relationTo: 'media',
      required: true,
      admin: {
        description: 'Upload the service standards PDF document',
      },
    },
    {
      name: 'category',
      type: 'select',
      required: true,
      options: [
        { label: 'Core Standards', value: 'core' },
        { label: 'Service Delivery', value: 'service-delivery' },
        { label: 'Quality Management', value: 'quality' },
        { label: 'Medical Services', value: 'medical' },
        { label: 'Support Services', value: 'support' },
        { label: 'Prevention Services', value: 'prevention' },
        { label: 'Other', value: 'other' },
      ],
      admin: {
        description: 'Category of service standard',
      },
    },
    {
      name: 'description',
      type: 'textarea',
      admin: {
        description: 'Brief description of what this standard covers',
      },
    },
    {
      name: 'order',
      type: 'number',
      defaultValue: 0,
      admin: {
        description: 'Display order (lower numbers appear first)',
      },
    },
    {
      name: 'lastUpdated',
      type: 'date',
      required: true,
      defaultValue: () => new Date().toISOString(),
      admin: {
        description: 'Date when this standard was last updated',
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' },
        { label: 'Archived', value: 'archived' },
      ],
    },
  ],
};
