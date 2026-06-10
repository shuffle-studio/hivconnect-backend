import { CollectionConfig, APIError } from 'payload';

async function verifyTurnstile(token: string, secret: string): Promise<boolean> {
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret, response: token }),
  });
  const data = await res.json() as { success: boolean };
  return data.success;
}

export const ContactSubmissions: CollectionConfig = {
  slug: 'contact-submissions',
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['fullName', 'email', 'inquiryType', 'createdAt', 'status'],
    description: 'Contact form messages from the public website',
  },
  hooks: {
    beforeValidate: [
      async ({ data, operation }) => {
        if (operation !== 'create') return data;
        const secret = process.env.TURNSTILE_SECRET_KEY;
        // No-op if Turnstile is not configured (safe rollout)
        if (!secret) return data;
        const token = (data as any)?.turnstileToken;
        if (!token) throw new APIError('Missing CAPTCHA token', 400, null, true);
        const valid = await verifyTurnstile(token, secret);
        if (!valid) throw new APIError('CAPTCHA verification failed', 400, null, true);
        const { turnstileToken: _, ...rest } = data as any;
        return rest;
      },
    ],
  },
  access: {
    read: ({ req: { user } }) => !!user,
    create: () => true,
    update: ({ req: { user } }) => !!user,
    delete: ({ req: { user } }) => !!user,
  },
  fields: [
    {
      name: 'fullName',
      type: 'text',
      admin: { position: 'sidebar' },
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'new',
      options: [
        { label: 'New', value: 'new' },
        { label: 'In Progress', value: 'in-progress' },
        { label: 'Resolved', value: 'resolved' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'firstName',
      type: 'text',
      required: true,
    },
    {
      name: 'lastName',
      type: 'text',
      required: true,
    },
    {
      name: 'email',
      type: 'email',
      required: true,
    },
    {
      name: 'phone',
      type: 'text',
    },
    {
      name: 'county',
      type: 'select',
      options: [
        { label: 'Middlesex County', value: 'middlesex' },
        { label: 'Somerset County', value: 'somerset' },
        { label: 'Hunterdon County', value: 'hunterdon' },
        { label: 'Other', value: 'other' },
      ],
    },
    {
      name: 'inquiryType',
      type: 'select',
      required: true,
      options: [
        { label: 'Information about services', value: 'services' },
        { label: 'Get tested', value: 'testing' },
        { label: 'Help with treatment', value: 'treatment' },
        { label: 'Support services', value: 'support' },
        { label: 'Planning Council information', value: 'planning-council' },
        { label: 'Other', value: 'other' },
      ],
    },
    {
      name: 'message',
      type: 'textarea',
      required: true,
    },
    {
      name: 'consentGiven',
      type: 'checkbox',
      required: true,
      label: 'Consent Given',
    },
    {
      name: 'adminNotes',
      type: 'textarea',
      admin: {
        description: 'Internal notes for handling this inquiry',
      },
    },
  ],
}
