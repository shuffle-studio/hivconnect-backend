import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`service_provider_options\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`label\` text NOT NULL,
  	\`order\` numeric DEFAULT 0,
  	\`active\` integer DEFAULT true,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`service_provider_options_label_idx\` ON \`service_provider_options\` (\`label\`);`)
  await db.run(sql`CREATE INDEX \`service_provider_options_updated_at_idx\` ON \`service_provider_options\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`service_provider_options_created_at_idx\` ON \`service_provider_options\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`committees\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`label\` text NOT NULL,
  	\`order\` numeric DEFAULT 0,
  	\`active\` integer DEFAULT true,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`committees_label_idx\` ON \`committees\` (\`label\`);`)
  await db.run(sql`CREATE INDEX \`committees_updated_at_idx\` ON \`committees\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`committees_created_at_idx\` ON \`committees\` (\`created_at\`);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`service_provider_options_id\` integer REFERENCES service_provider_options(id);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`committees_id\` integer REFERENCES committees(id);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_service_provider_options_i_idx\` ON \`payload_locked_documents_rels\` (\`service_provider_options_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_committees_id_idx\` ON \`payload_locked_documents_rels\` (\`committees_id\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`service_provider_options\`;`)
  await db.run(sql`DROP TABLE \`committees\`;`)
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_payload_locked_documents_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`users_id\` integer,
  	\`providers_id\` integer,
  	\`resources_id\` integer,
  	\`blog_id\` integer,
  	\`pdf_library_id\` integer,
  	\`tags_id\` integer,
  	\`faqs_id\` integer,
  	\`pages_id\` integer,
  	\`membership_applications_id\` integer,
  	\`contact_submissions_id\` integer,
  	\`events_id\` integer,
  	\`bylaws_id\` integer,
  	\`service_standards_id\` integer,
  	\`media_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`payload_locked_documents\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`users_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`providers_id\`) REFERENCES \`providers\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`resources_id\`) REFERENCES \`resources\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`blog_id\`) REFERENCES \`blog\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`pdf_library_id\`) REFERENCES \`pdf_library\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`tags_id\`) REFERENCES \`tags\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`faqs_id\`) REFERENCES \`faqs\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`pages_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`membership_applications_id\`) REFERENCES \`membership_applications\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`contact_submissions_id\`) REFERENCES \`contact_submissions\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`events_id\`) REFERENCES \`events\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`bylaws_id\`) REFERENCES \`bylaws\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`service_standards_id\`) REFERENCES \`service_standards\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`media_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new_payload_locked_documents_rels\`("id", "order", "parent_id", "path", "users_id", "providers_id", "resources_id", "blog_id", "pdf_library_id", "tags_id", "faqs_id", "pages_id", "membership_applications_id", "contact_submissions_id", "events_id", "bylaws_id", "service_standards_id", "media_id") SELECT "id", "order", "parent_id", "path", "users_id", "providers_id", "resources_id", "blog_id", "pdf_library_id", "tags_id", "faqs_id", "pages_id", "membership_applications_id", "contact_submissions_id", "events_id", "bylaws_id", "service_standards_id", "media_id" FROM \`payload_locked_documents_rels\`;`)
  await db.run(sql`DROP TABLE \`payload_locked_documents_rels\`;`)
  await db.run(sql`ALTER TABLE \`__new_payload_locked_documents_rels\` RENAME TO \`payload_locked_documents_rels\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_order_idx\` ON \`payload_locked_documents_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_parent_idx\` ON \`payload_locked_documents_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_path_idx\` ON \`payload_locked_documents_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_users_id_idx\` ON \`payload_locked_documents_rels\` (\`users_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_providers_id_idx\` ON \`payload_locked_documents_rels\` (\`providers_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_resources_id_idx\` ON \`payload_locked_documents_rels\` (\`resources_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_blog_id_idx\` ON \`payload_locked_documents_rels\` (\`blog_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_pdf_library_id_idx\` ON \`payload_locked_documents_rels\` (\`pdf_library_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_tags_id_idx\` ON \`payload_locked_documents_rels\` (\`tags_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_faqs_id_idx\` ON \`payload_locked_documents_rels\` (\`faqs_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_pages_id_idx\` ON \`payload_locked_documents_rels\` (\`pages_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_membership_applications_id_idx\` ON \`payload_locked_documents_rels\` (\`membership_applications_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_contact_submissions_id_idx\` ON \`payload_locked_documents_rels\` (\`contact_submissions_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_events_id_idx\` ON \`payload_locked_documents_rels\` (\`events_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_bylaws_id_idx\` ON \`payload_locked_documents_rels\` (\`bylaws_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_service_standards_id_idx\` ON \`payload_locked_documents_rels\` (\`service_standards_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_media_id_idx\` ON \`payload_locked_documents_rels\` (\`media_id\`);`)
}
