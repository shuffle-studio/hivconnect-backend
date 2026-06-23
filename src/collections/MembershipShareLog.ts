import { CollectionConfig } from 'payload';

/**
 * Audit trail for membership-application share links (SHU-1017).
 *
 * Every "Create share link" action writes one row here: who created the link,
 * which application it pointed at, when, and when the link expires. The share
 * token itself stays a stateless HMAC-signed token (see `src/lib/shareToken.ts`);
 * this collection exists purely for the PII "who shared what, when" audit trail.
 *
 * Entries are created server-side only (by the share-link endpoint). The admin
 * UI does not expose a create button. Reads are authenticated-only.
 */
export const MembershipShareLog: CollectionConfig = {
  slug: 'membership-share-log',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['application', 'sharedBy', 'createdAt', 'expiresAt', 'revoked'],
    description: 'Audit log of membership application share links (who shared what, when).',
    group: 'Logs',
  },
  access: {
    // Authenticated read — this is audit data tied to sensitive applications.
    read: ({ req: { user } }) => !!user,
    // Created server-side only (by the share-link endpoint via local API
    // overrideAccess). No interactive create / update / delete.
    create: () => false,
    update: () => false,
    delete: ({ req: { user } }) => !!user,
  },
  fields: [
    {
      name: 'application',
      type: 'relationship',
      relationTo: 'membership-applications',
      required: true,
      admin: {
        description: 'The application this share link grants access to.',
      },
    },
    {
      name: 'sharedBy',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        description: 'The reviewer who created the share link.',
      },
    },
    {
      name: 'expiresAt',
      type: 'date',
      required: true,
      admin: {
        description: 'When the share link stops working.',
        date: { pickerAppearance: 'dayAndTime' },
      },
    },
    {
      // SHU-1018: the token's `jti`. Looked up on every public open so a link
      // can be revoked before its natural expiry. Indexed for cheap lookups.
      name: 'tokenId',
      type: 'text',
      index: true,
      admin: {
        description: 'Unique id (jti) of the signed share token this row tracks.',
      },
    },
    {
      // SHU-1018: when true, the public open endpoint rejects the link.
      name: 'revoked',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Whether this link has been stopped before its expiry.',
      },
    },
    {
      name: 'revokedAt',
      type: 'date',
      admin: {
        description: 'When the link was revoked.',
        date: { pickerAppearance: 'dayAndTime' },
        condition: (data) => Boolean(data?.revoked),
      },
    },
    {
      name: 'revokedBy',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        description: 'The reviewer who revoked the link.',
        condition: (data) => Boolean(data?.revoked),
      },
    },
    // `createdAt` is added automatically by Payload (timestamps default true).
  ],
};
