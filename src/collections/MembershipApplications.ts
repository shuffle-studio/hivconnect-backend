import { CollectionConfig, APIError } from 'payload';
import { afterChangeHook, afterDeleteHook } from '../hooks/triggerFrontendRebuild';
import { membershipExportEndpoints } from '../endpoints/membershipExport';

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
  // Export & share (SHU-1017): per-document PDF/DOCX download, signed share links.
  endpoints: membershipExportEndpoints,
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
    // Authenticated-only read — applications contain sensitive PII and must
    // never be exposed through the public API.
    read: ({ req: { user } }) => !!user,
    // Public create (for form submissions)
    create: () => true,
    // Admin only for updates
    update: ({ req: { user } }) => !!user,
    delete: ({ req: { user } }) => !!user,
  },
  fields: [
    // Export & share actions (SHU-1017): Download PDF / Word + Create share link.
    // UI-only field rendered in the sidebar; carries no stored data.
    {
      name: 'exportActions',
      type: 'ui',
      admin: {
        position: 'sidebar',
        components: {
          Field: '/components/admin/MembershipExportActions#default',
        },
      },
    },
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
    // Personal Information (flat schema). Core fields are required; the rest
    // are optional so this migration is purely additive to existing rows.
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
      name: 'birthMonth',
      type: 'text',
    },
    {
      name: 'birthDay',
      type: 'text',
    },
    {
      name: 'birthYear',
      type: 'text',
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
      admin: { description: 'Primary phone (auto-filled from cell or home)' },
    },
    {
      name: 'homePhone',
      type: 'text',
    },
    {
      name: 'cellPhone',
      type: 'text',
    },
    {
      name: 'bestTimeToCall',
      type: 'text',
    },
    {
      name: 'streetAddress',
      type: 'text',
      required: true,
    },
    {
      name: 'addressLine2',
      type: 'text',
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
    {
      name: 'country',
      type: 'text',
    },
    // Employment
    {
      name: 'isEmployed',
      type: 'checkbox',
    },
    {
      name: 'employers',
      type: 'text',
    },
    {
      name: 'jobTitle',
      type: 'text',
    },
    {
      name: 'companyAddress',
      type: 'text',
    },
    {
      name: 'companyAddressLine2',
      type: 'text',
    },
    {
      name: 'companyCity',
      type: 'text',
    },
    {
      name: 'companyState',
      type: 'text',
    },
    {
      name: 'companyZipCode',
      type: 'text',
    },
    // Demographics
    {
      name: 'receivedRyanWhiteServices',
      type: 'checkbox',
    },
    {
      name: 'gender',
      type: 'text',
    },
    {
      name: 'age',
      type: 'text',
    },
    {
      name: 'raceEthnicity',
      type: 'text',
    },
    {
      name: 'mailingLists',
      type: 'array',
      labels: { singular: 'Mailing List', plural: 'Mailing Lists' },
      fields: [{ name: 'list', type: 'text' }],
    },
    {
      name: 'languages',
      type: 'array',
      fields: [{ name: 'language', type: 'text' }],
    },
    {
      name: 'diverseExperience',
      type: 'array',
      fields: [{ name: 'experience', type: 'text' }],
    },
    {
      name: 'serviceProviders',
      type: 'array',
      fields: [{ name: 'provider', type: 'text' }],
    },
    {
      name: 'needsAssistance',
      type: 'checkbox',
    },
    {
      name: 'assistanceDescription',
      type: 'textarea',
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
    {
      name: 'backgroundExperience',
      type: 'textarea',
    },
    {
      name: 'eligibilityInfo',
      type: 'textarea',
    },
    {
      name: 'membershipCategories',
      type: 'array',
      fields: [{ name: 'category', type: 'text' }],
    },
    {
      name: 'experienceInterests',
      type: 'array',
      fields: [{ name: 'interest', type: 'text' }],
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
