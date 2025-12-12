import { CollectionConfig } from 'payload';
import { afterChangeHook, afterDeleteHook } from '../hooks/triggerFrontendRebuild';

export const Resources: CollectionConfig = {
  slug: 'resources',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'category', 'language', 'status'],
    description: 'Downloadable resources and external links',
  },
  hooks: {
    afterChange: [afterChangeHook],
    afterDelete: [afterDeleteHook],
  },
  access: {
    read: ({ req: { user } }) => {
      // Published resources are public
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
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'URL-friendly version of the title',
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
      name: 'description',
      type: 'richText',
      required: true,
    },
    {
      name: 'category',
      type: 'select',
      required: true,
      options: [
        { label: 'Testing', value: 'testing' },
        { label: 'Treatment', value: 'treatment' },
        { label: 'Support', value: 'support' },
        { label: 'Prevention', value: 'prevention' },
        { label: 'Legal', value: 'legal' },
        { label: 'Financial', value: 'financial' },
        { label: 'Housing', value: 'housing' },
        { label: 'Living with HIV', value: 'living_with_hiv' },
        { label: 'New Jersey Resources', value: 'nj_resources' },
        { label: 'Federal Websites', value: 'federal_websites' },
        { label: 'Resources for Providers', value: 'provider_resources' },
        { label: 'Other', value: 'other' },
      ],
    },
    {
      name: 'pdfFile',
      type: 'upload',
      relationTo: 'media',
      label: 'PDF File (optional)',
      admin: {
        description: 'Upload a PDF file (will be stored in Cloudflare R2)',
      },
    },
    {
      name: 'externalLink',
      type: 'text',
      label: 'External Link (optional)',
      admin: {
        description: 'Link to external resource (if no PDF)',
      },
    },
    {
      name: 'linkType',
      type: 'select',
      required: true,
      defaultValue: 'internal_pdf',
      options: [
        { label: 'Internal PDF/Document', value: 'internal_pdf' },
        { label: 'External Link/Website', value: 'external_link' },
      ],
      admin: {
        description: 'Type of resource - internal PDF or external website',
        position: 'sidebar',
      },
    },
    {
      name: 'tags',
      type: 'relationship',
      relationTo: 'tags',
      hasMany: true,
    },
    {
      name: 'language',
      type: 'select',
      required: true,
      defaultValue: 'english',
      options: [
        { label: 'English', value: 'english' },
        { label: 'Spanish', value: 'spanish' },
        { label: 'Both', value: 'both' },
      ],
    },
    {
      name: 'featured',
      type: 'checkbox',
      label: 'Featured Resource',
      defaultValue: false,
      admin: {
        description: 'Show this resource prominently on the resources page',
      },
    },
    {
      name: 'publishedDate',
      type: 'date',
      required: true,
      defaultValue: () => new Date().toISOString(),
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
