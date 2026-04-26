import { CollectionConfig, APIError } from 'payload';
import { afterChangeHook, afterDeleteHook } from '../hooks/triggerFrontendRebuild';

async function verifyTurnstile(token: string, secret: string): Promise<boolean> {
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret, response: token }),
  });
  const data = await res.json() as { success: boolean };
  return data.success;
}

export const MembershipApplications: CollectionConfig = {
  slug: 'membership-applications',
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['fullName', 'email', 'createdAt', 'status'],
    description: 'Planning Council membership applications with status tracking',
  },
  hooks: {
    beforeValidate: [
      async ({ data, operation }) => {
        if (operation !== 'create') return data;
        const secret = process.env.TURNSTILE_SECRET_KEY;
        if (!secret) return data;
        const token = (data as any)?.turnstileToken;
        if (!token) throw new APIError('Missing CAPTCHA token', 400, null, true);
        const valid = await verifyTurnstile(token, secret);
        if (!valid) throw new APIError('CAPTCHA verification failed', 400, null, true);
        const { turnstileToken: _, ...rest } = data as any;
        return rest;
      },
    ],
    afterChange: [afterChangeHook],
    afterDelete: [afterDeleteHook],
  },
  access: {
    // Public read access for now (we can restrict later if needed)
    read: () => true,
    // Public create (for form submissions)
    create: () => true,
    // Admin only for updates
    update: ({ req: { user } }) => !!user,
    delete: ({ req: { user } }) => !!user,
  },
  fields: [
    // Simple auto-generated full name
    {
      name: 'fullName',
      type: 'text',
      admin: {
        position: 'sidebar',
      },
    },
    // Application status
    {
      name: 'status',
      type: 'select',
      defaultValue: 'pending',
      options: [
        { label: 'Pending Review', value: 'pending' },
        { label: 'Under Review', value: 'reviewing' },
        { label: 'Approved', value: 'approved' },
        { label: 'Rejected', value: 'rejected' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    // Personal Information - FLAT (no groups for now)
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
      name: 'confirmEmail',
      type: 'email',
      required: true,
    },
    {
      name: 'phone',
      type: 'text',
    },
    {
      name: 'streetAddress',
      type: 'text',
      required: true,
    },
    {
      name: 'city',
      type: 'text',
      required: true,
    },
    {
      name: 'state',
      type: 'text',
      required: true,
    },
    {
      name: 'zipCode',
      type: 'text',
      required: true,
    },
    // Experience
    {
      name: 'whyJoin',
      type: 'textarea',
      required: true,
      label: 'Why do you want to join?',
    },
    {
      name: 'hivExperience',
      type: 'textarea',
      required: true,
      label: 'HIV/AIDS Experience',
    },
    // Commitment
    {
      name: 'agreedToCommitments',
      type: 'checkbox',
      required: true,
      label: 'Agreed to Commitments',
    },
    {
      name: 'consentGiven',
      type: 'checkbox',
      required: true,
      label: 'Consent Given',
    },
    // Admin Notes
    {
      name: 'adminNotes',
      type: 'textarea',
      admin: {
        description: 'Internal notes for reviewing application',
      },
    },
  ],
}
