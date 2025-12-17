import { GlobalConfig } from 'payload';
import { afterChangeGlobalHook } from '../hooks/triggerFrontendRebuild';

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: 'Site Settings',
  admin: {
    description: 'Global site-wide settings',
  },
  hooks: {
    afterChange: [afterChangeGlobalHook],
  },
  access: {
    read: () => true, // Public read access
    update: ({ req: { user } }) => user?.role === 'admin',
  },
  fields: [
    {
      name: 'siteName',
      type: 'text',
      required: true,
      defaultValue: 'HIV Connect Central NJ',
    },
    {
      name: 'hotlineNumber',
      type: 'text',
      required: true,
      admin: {
        description: 'Main hotline/contact number',
      },
    },
    {
      name: 'navigation',
      type: 'array',
      label: 'Header Navigation',
      admin: {
        description: 'Main navigation menu items with optional dropdown children',
      },
      fields: [
        {
          name: 'label',
          type: 'text',
          required: true,
          admin: {
            description: 'Menu item text',
          },
        },
        {
          name: 'url',
          type: 'text',
          admin: {
            description: 'Link URL (leave empty if this item has dropdown children)',
          },
        },
        {
          name: 'openInNewTab',
          type: 'checkbox',
          defaultValue: false,
          admin: {
            description: 'Open link in new tab',
          },
        },
        {
          name: 'children',
          type: 'array',
          label: 'Dropdown Items',
          admin: {
            description: 'Child menu items (creates a dropdown menu)',
          },
          fields: [
            {
              name: 'label',
              type: 'text',
              required: true,
              admin: {
                description: 'Dropdown item text',
              },
            },
            {
              name: 'url',
              type: 'text',
              required: true,
              admin: {
                description: 'Link URL for this dropdown item',
              },
            },
            {
              name: 'openInNewTab',
              type: 'checkbox',
              defaultValue: false,
              admin: {
                description: 'Open link in new tab',
              },
            },
            {
              name: 'order',
              type: 'number',
              defaultValue: 0,
              admin: {
                description: 'Display order within dropdown',
              },
            },
          ],
        },
        {
          name: 'order',
          type: 'number',
          defaultValue: 0,
          admin: {
            description: 'Display order (0 = first, 1 = second, etc.)',
          },
        },
      ],
    },
    {
      name: 'logo',
      type: 'upload',
      relationTo: 'media',
      label: 'Site Logo',
    },
    {
      name: 'footerLinks',
      type: 'array',
      label: 'Footer Links',
      fields: [
        {
          name: 'label',
          type: 'text',
          required: true,
        },
        {
          name: 'url',
          type: 'text',
          required: true,
        },
        {
          name: 'openInNewTab',
          type: 'checkbox',
          defaultValue: false,
        },
      ],
    },
    {
      name: 'socialMedia',
      type: 'group',
      label: 'Social Media Links',
      fields: [
        {
          name: 'facebook',
          type: 'text',
        },
        {
          name: 'twitter',
          type: 'text',
        },
        {
          name: 'instagram',
          type: 'text',
        },
        {
          name: 'linkedin',
          type: 'text',
        },
      ],
    },
    {
      name: 'contactEmail',
      type: 'email',
      required: true,
    },
    {
      name: 'maintenanceMode',
      type: 'checkbox',
      label: 'Maintenance Mode',
      defaultValue: false,
      admin: {
        description: 'Enable to show maintenance page',
      },
    },
    {
      name: 'maintenanceMessage',
      type: 'textarea',
      admin: {
        condition: (data) => data.maintenanceMode,
        description: 'Message to display during maintenance',
      },
    },
  ],
};
