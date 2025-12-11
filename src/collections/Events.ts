import { CollectionConfig } from 'payload';
import { afterChangeHook, afterDeleteHook } from '../hooks/triggerFrontendRebuild';
import { geocodeAddress, sleep } from '../utils/geocode';

export const Events: CollectionConfig = {
  slug: 'events',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'startDate', 'category', 'status'],
    description: 'Community events, meetings, and activities',
  },
  hooks: {
    beforeChange: [
      async ({ data, operation, originalDoc }) => {
        // Skip geocoding for virtual events (clear coordinates)
        if (data.location?.type === 'virtual') {
          if (data.coordinates) {
            data.coordinates = { lat: null, lng: null };
          }
          return data;
        }

        // Skip if no address provided
        const { address, city, state, zipCode } = data.location || {};
        if (!address && !city) {
          console.warn('[Events Hook] No address provided, skipping geocoding');
          return data;
        }

        // Skip if coordinates exist and address hasn't changed (for updates)
        if (operation === 'update' && originalDoc) {
          const addressChanged =
            originalDoc.location?.address !== address ||
            originalDoc.location?.city !== city ||
            originalDoc.location?.state !== state ||
            originalDoc.location?.zipCode !== zipCode;

          if (data.coordinates?.lat && data.coordinates?.lng && !addressChanged) {
            console.log('[Events Hook] Coordinates exist and address unchanged, skipping geocoding');
            return data;
          }
        }

        // Respect Nominatim rate limit (1 req/sec)
        await sleep(1000);

        // Geocode address
        console.log('[Events Hook] Geocoding address...');
        const coords = await geocodeAddress(address, city, state, zipCode);

        if (coords) {
          data.coordinates = coords;
          console.log(`[Events Hook] Geocoded to: ${coords.lat}, ${coords.lng}`);
        } else {
          console.warn('[Events Hook] Geocoding failed, coordinates will be empty');
          // Don't overwrite existing coordinates if geocoding fails
          if (!data.coordinates?.lat) {
            data.coordinates = { lat: null, lng: null };
          }
        }

        return data;
      },
    ],
    afterChange: [afterChangeHook],
    afterDelete: [afterDeleteHook],
  },
  access: {
    // Public read access for frontend
    read: ({ req: { user } }) => {
      if (user) return true;
      // Public can only see published events
      return { status: { equals: 'published' } };
    },
    // Admin only for mutations
    create: ({ req: { user } }) => !!user,
    update: ({ req: { user } }) => !!user,
    delete: ({ req: { user } }) => !!user,
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
      name: 'featuredImage',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'Optional image for event listing',
      },
    },
    // Date & Time
    {
      name: 'startDate',
      type: 'date',
      required: true,
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'endDate',
      type: 'date',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
        description: 'Optional end date/time for multi-day or timed events',
      },
    },
    // Location
    {
      name: 'location',
      type: 'group',
      fields: [
        {
          name: 'type',
          type: 'select',
          required: true,
          defaultValue: 'in-person',
          options: [
            { label: 'In-Person', value: 'in-person' },
            { label: 'Virtual', value: 'virtual' },
            { label: 'Hybrid', value: 'hybrid' },
          ],
        },
        {
          name: 'venueName',
          type: 'text',
          admin: {
            condition: (data) => {
              return data.location?.type === 'in-person' || data.location?.type === 'hybrid';
            },
          },
        },
        {
          name: 'address',
          type: 'text',
          admin: {
            condition: (data) => {
              return data.location?.type === 'in-person' || data.location?.type === 'hybrid';
            },
          },
        },
        {
          name: 'city',
          type: 'text',
          admin: {
            condition: (data) => {
              return data.location?.type === 'in-person' || data.location?.type === 'hybrid';
            },
          },
        },
        {
          name: 'state',
          type: 'text',
          defaultValue: 'NJ',
          admin: {
            condition: (data) => {
              return data.location?.type === 'in-person' || data.location?.type === 'hybrid';
            },
          },
        },
        {
          name: 'zipCode',
          type: 'text',
          admin: {
            condition: (data) => {
              return data.location?.type === 'in-person' || data.location?.type === 'hybrid';
            },
          },
        },
        {
          name: 'virtualLink',
          type: 'text',
          admin: {
            description: 'Zoom/Teams/Virtual meeting link',
            condition: (data) => {
              return data.location?.type === 'virtual' || data.location?.type === 'hybrid';
            },
          },
        },
      ],
    },
    // Coordinates (auto-populated from address)
    {
      name: 'coordinates',
      type: 'group',
      admin: {
        description: 'Auto-populated from address. You can manually adjust if needed.',
      },
      fields: [
        {
          name: 'lat',
          type: 'number',
          label: 'Latitude',
        },
        {
          name: 'lng',
          type: 'number',
          label: 'Longitude',
        },
      ],
    },
    // Contact & RSVP
    {
      name: 'contactEmail',
      type: 'email',
      admin: {
        description: 'Contact email for questions about this event',
      },
    },
    {
      name: 'contactPhone',
      type: 'text',
      admin: {
        description: 'Contact phone for questions',
      },
    },
    {
      name: 'rsvpLink',
      type: 'text',
      admin: {
        description: 'External RSVP/registration link (if needed)',
      },
    },
    // Organization
    {
      name: 'category',
      type: 'select',
      required: true,
      options: [
        { label: 'Planning Council Meeting', value: 'planning-council' },
        { label: 'Committee Meeting', value: 'committee' },
        { label: 'Community Event', value: 'community' },
        { label: 'Training/Workshop', value: 'training' },
        { label: 'Health Fair', value: 'health-fair' },
        { label: 'Support Group', value: 'support-group' },
        { label: 'Other', value: 'other' },
      ],
    },
    {
      name: 'tags',
      type: 'relationship',
      relationTo: 'tags',
      hasMany: true,
      admin: {
        description: 'Optional tags for filtering events',
      },
    },
    // Status
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' },
        { label: 'Cancelled', value: 'cancelled' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'featured',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Show this event prominently on homepage/events page',
        position: 'sidebar',
      },
    },
  ],
};
