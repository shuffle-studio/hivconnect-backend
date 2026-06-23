import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite'

/**
 * SHU-1018 — Share-link management.
 *
 * Additive migration: adds the columns the `membership-share-log` collection
 * needs to track and revoke individual share links:
 *   - `token_id`   the signed token's jti (indexed; looked up on every open)
 *   - `revoked`    whether the link has been stopped before expiry
 *   - `revoked_at` when it was stopped
 *   - `revoked_by_id` FK → users(id), the reviewer who stopped it
 *
 * Pure ALTER TABLE ADD COLUMN, so it is safe to run against the existing table
 * (no data loss, no table rebuild).
 */
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`membership_share_log\` ADD \`token_id\` text;`)
  await db.run(sql`ALTER TABLE \`membership_share_log\` ADD \`revoked\` integer DEFAULT false;`)
  await db.run(sql`ALTER TABLE \`membership_share_log\` ADD \`revoked_at\` text;`)
  await db.run(
    sql`ALTER TABLE \`membership_share_log\` ADD \`revoked_by_id\` integer REFERENCES users(id);`,
  )
  await db.run(
    sql`CREATE INDEX \`membership_share_log_token_id_idx\` ON \`membership_share_log\` (\`token_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`membership_share_log_revoked_by_idx\` ON \`membership_share_log\` (\`revoked_by_id\`);`,
  )
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP INDEX IF EXISTS \`membership_share_log_token_id_idx\`;`)
  await db.run(sql`DROP INDEX IF EXISTS \`membership_share_log_revoked_by_idx\`;`)
  await db.run(sql`ALTER TABLE \`membership_share_log\` DROP COLUMN \`token_id\`;`)
  await db.run(sql`ALTER TABLE \`membership_share_log\` DROP COLUMN \`revoked\`;`)
  await db.run(sql`ALTER TABLE \`membership_share_log\` DROP COLUMN \`revoked_at\`;`)
  await db.run(sql`ALTER TABLE \`membership_share_log\` DROP COLUMN \`revoked_by_id\`;`)
}
