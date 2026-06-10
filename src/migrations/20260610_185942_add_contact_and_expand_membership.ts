import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`membership_applications_mailing_lists\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`list\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`membership_applications\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`membership_applications_mailing_lists_order_idx\` ON \`membership_applications_mailing_lists\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`membership_applications_mailing_lists_parent_id_idx\` ON \`membership_applications_mailing_lists\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`membership_applications_languages\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`language\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`membership_applications\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`membership_applications_languages_order_idx\` ON \`membership_applications_languages\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`membership_applications_languages_parent_id_idx\` ON \`membership_applications_languages\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`membership_applications_diverse_experience\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`experience\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`membership_applications\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`membership_applications_diverse_experience_order_idx\` ON \`membership_applications_diverse_experience\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`membership_applications_diverse_experience_parent_id_idx\` ON \`membership_applications_diverse_experience\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`membership_applications_service_providers\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`provider\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`membership_applications\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`membership_applications_service_providers_order_idx\` ON \`membership_applications_service_providers\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`membership_applications_service_providers_parent_id_idx\` ON \`membership_applications_service_providers\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`membership_applications_membership_categories\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`category\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`membership_applications\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`membership_applications_membership_categories_order_idx\` ON \`membership_applications_membership_categories\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`membership_applications_membership_categories_parent_id_idx\` ON \`membership_applications_membership_categories\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`membership_applications_experience_interests\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`interest\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`membership_applications\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`membership_applications_experience_interests_order_idx\` ON \`membership_applications_experience_interests\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`membership_applications_experience_interests_parent_id_idx\` ON \`membership_applications_experience_interests\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`contact_submissions\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`full_name\` text,
  	\`status\` text DEFAULT 'new',
  	\`first_name\` text NOT NULL,
  	\`last_name\` text NOT NULL,
  	\`email\` text NOT NULL,
  	\`phone\` text,
  	\`county\` text,
  	\`inquiry_type\` text NOT NULL,
  	\`message\` text NOT NULL,
  	\`consent_given\` integer DEFAULT false NOT NULL,
  	\`admin_notes\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`contact_submissions_updated_at_idx\` ON \`contact_submissions\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`contact_submissions_created_at_idx\` ON \`contact_submissions\` (\`created_at\`);`)
  await db.run(sql`ALTER TABLE \`membership_applications\` ADD \`birth_month\` text;`)
  await db.run(sql`ALTER TABLE \`membership_applications\` ADD \`birth_day\` text;`)
  await db.run(sql`ALTER TABLE \`membership_applications\` ADD \`birth_year\` text;`)
  await db.run(sql`ALTER TABLE \`membership_applications\` ADD \`home_phone\` text;`)
  await db.run(sql`ALTER TABLE \`membership_applications\` ADD \`cell_phone\` text;`)
  await db.run(sql`ALTER TABLE \`membership_applications\` ADD \`best_time_to_call\` text;`)
  await db.run(sql`ALTER TABLE \`membership_applications\` ADD \`address_line2\` text;`)
  await db.run(sql`ALTER TABLE \`membership_applications\` ADD \`country\` text;`)
  await db.run(sql`ALTER TABLE \`membership_applications\` ADD \`is_employed\` integer;`)
  await db.run(sql`ALTER TABLE \`membership_applications\` ADD \`employers\` text;`)
  await db.run(sql`ALTER TABLE \`membership_applications\` ADD \`job_title\` text;`)
  await db.run(sql`ALTER TABLE \`membership_applications\` ADD \`company_address\` text;`)
  await db.run(sql`ALTER TABLE \`membership_applications\` ADD \`company_address_line2\` text;`)
  await db.run(sql`ALTER TABLE \`membership_applications\` ADD \`company_city\` text;`)
  await db.run(sql`ALTER TABLE \`membership_applications\` ADD \`company_state\` text;`)
  await db.run(sql`ALTER TABLE \`membership_applications\` ADD \`company_zip_code\` text;`)
  await db.run(sql`ALTER TABLE \`membership_applications\` ADD \`received_ryan_white_services\` integer;`)
  await db.run(sql`ALTER TABLE \`membership_applications\` ADD \`gender\` text;`)
  await db.run(sql`ALTER TABLE \`membership_applications\` ADD \`age\` text;`)
  await db.run(sql`ALTER TABLE \`membership_applications\` ADD \`race_ethnicity\` text;`)
  await db.run(sql`ALTER TABLE \`membership_applications\` ADD \`needs_assistance\` integer;`)
  await db.run(sql`ALTER TABLE \`membership_applications\` ADD \`assistance_description\` text;`)
  await db.run(sql`ALTER TABLE \`membership_applications\` ADD \`background_experience\` text;`)
  await db.run(sql`ALTER TABLE \`membership_applications\` ADD \`eligibility_info\` text;`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`contact_submissions_id\` integer REFERENCES contact_submissions(id);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_contact_submissions_id_idx\` ON \`payload_locked_documents_rels\` (\`contact_submissions_id\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`membership_applications_mailing_lists\`;`)
  await db.run(sql`DROP TABLE \`membership_applications_languages\`;`)
  await db.run(sql`DROP TABLE \`membership_applications_diverse_experience\`;`)
  await db.run(sql`DROP TABLE \`membership_applications_service_providers\`;`)
  await db.run(sql`DROP TABLE \`membership_applications_membership_categories\`;`)
  await db.run(sql`DROP TABLE \`membership_applications_experience_interests\`;`)
  await db.run(sql`DROP TABLE \`contact_submissions\`;`)
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
  	FOREIGN KEY (\`events_id\`) REFERENCES \`events\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`bylaws_id\`) REFERENCES \`bylaws\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`service_standards_id\`) REFERENCES \`service_standards\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`media_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new_payload_locked_documents_rels\`("id", "order", "parent_id", "path", "users_id", "providers_id", "resources_id", "blog_id", "pdf_library_id", "tags_id", "faqs_id", "pages_id", "membership_applications_id", "events_id", "bylaws_id", "service_standards_id", "media_id") SELECT "id", "order", "parent_id", "path", "users_id", "providers_id", "resources_id", "blog_id", "pdf_library_id", "tags_id", "faqs_id", "pages_id", "membership_applications_id", "events_id", "bylaws_id", "service_standards_id", "media_id" FROM \`payload_locked_documents_rels\`;`)
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
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_events_id_idx\` ON \`payload_locked_documents_rels\` (\`events_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_bylaws_id_idx\` ON \`payload_locked_documents_rels\` (\`bylaws_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_service_standards_id_idx\` ON \`payload_locked_documents_rels\` (\`service_standards_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_media_id_idx\` ON \`payload_locked_documents_rels\` (\`media_id\`);`)
  await db.run(sql`ALTER TABLE \`membership_applications\` DROP COLUMN \`birth_month\`;`)
  await db.run(sql`ALTER TABLE \`membership_applications\` DROP COLUMN \`birth_day\`;`)
  await db.run(sql`ALTER TABLE \`membership_applications\` DROP COLUMN \`birth_year\`;`)
  await db.run(sql`ALTER TABLE \`membership_applications\` DROP COLUMN \`home_phone\`;`)
  await db.run(sql`ALTER TABLE \`membership_applications\` DROP COLUMN \`cell_phone\`;`)
  await db.run(sql`ALTER TABLE \`membership_applications\` DROP COLUMN \`best_time_to_call\`;`)
  await db.run(sql`ALTER TABLE \`membership_applications\` DROP COLUMN \`address_line2\`;`)
  await db.run(sql`ALTER TABLE \`membership_applications\` DROP COLUMN \`country\`;`)
  await db.run(sql`ALTER TABLE \`membership_applications\` DROP COLUMN \`is_employed\`;`)
  await db.run(sql`ALTER TABLE \`membership_applications\` DROP COLUMN \`employers\`;`)
  await db.run(sql`ALTER TABLE \`membership_applications\` DROP COLUMN \`job_title\`;`)
  await db.run(sql`ALTER TABLE \`membership_applications\` DROP COLUMN \`company_address\`;`)
  await db.run(sql`ALTER TABLE \`membership_applications\` DROP COLUMN \`company_address_line2\`;`)
  await db.run(sql`ALTER TABLE \`membership_applications\` DROP COLUMN \`company_city\`;`)
  await db.run(sql`ALTER TABLE \`membership_applications\` DROP COLUMN \`company_state\`;`)
  await db.run(sql`ALTER TABLE \`membership_applications\` DROP COLUMN \`company_zip_code\`;`)
  await db.run(sql`ALTER TABLE \`membership_applications\` DROP COLUMN \`received_ryan_white_services\`;`)
  await db.run(sql`ALTER TABLE \`membership_applications\` DROP COLUMN \`gender\`;`)
  await db.run(sql`ALTER TABLE \`membership_applications\` DROP COLUMN \`age\`;`)
  await db.run(sql`ALTER TABLE \`membership_applications\` DROP COLUMN \`race_ethnicity\`;`)
  await db.run(sql`ALTER TABLE \`membership_applications\` DROP COLUMN \`needs_assistance\`;`)
  await db.run(sql`ALTER TABLE \`membership_applications\` DROP COLUMN \`assistance_description\`;`)
  await db.run(sql`ALTER TABLE \`membership_applications\` DROP COLUMN \`background_experience\`;`)
  await db.run(sql`ALTER TABLE \`membership_applications\` DROP COLUMN \`eligibility_info\`;`)
}
