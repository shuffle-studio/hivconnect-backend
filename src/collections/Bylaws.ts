import { CollectionConfig } from 'payload';
import { afterChangeHook, afterDeleteHook } from '../hooks/triggerFrontendRebuild';

export const Bylaws: CollectionConfig = {
  slug: 'bylaws',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'version', 'effectiveDate', 'status'],
    description: 'Planning Council Bylaws and organizational documents',
  },
  hooks: {
    afterChange: [afterChangeHook],
    afterDelete: [afterDeleteHook],
  },
  access: {
    read: ({ req: { user } }) => {
      // Published bylaws are public
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
        description: 'Bylaws document title (e.g., "Planning Council Bylaws")',
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
        description: 'Upload the bylaws PDF document',
      },
    },
    {
      name: 'version',
      type: 'text',
      admin: {
        description: 'Document version (e.g., "2024 Revision", "Version 3.0")',
      },
    },
    {
      name: 'effectiveDate',
      type: 'date',
      required: true,
      admin: {
        description: 'Date when these bylaws became effective',
      },
    },
    {
      name: 'description',
      type: 'textarea',
      admin: {
        description: 'Brief description of the document or changes in this version',
      },
    },
    {
      name: 'isCurrent',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Mark as the current/active version of bylaws',
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
