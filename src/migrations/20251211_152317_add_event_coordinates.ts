import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`events\` ADD \`coordinates_lat\` numeric;`)
  await db.run(sql`ALTER TABLE \`events\` ADD \`coordinates_lng\` numeric;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`events\` DROP COLUMN \`coordinates_lat\`;`)
  await db.run(sql`ALTER TABLE \`events\` DROP COLUMN \`coordinates_lng\`;`)
}
