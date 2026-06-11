-- Seed the membership-form option collections with the current curated values.
-- Run AFTER the migration that creates these tables has been applied (pnpm run deploy).
-- Usage: wrangler d1 execute hivconnect-db-production --remote --file scripts/seed-form-options.sql
-- Idempotent-ish: clears existing rows first so re-running won't duplicate.

DELETE FROM service_provider_options;
INSERT INTO service_provider_options (label, "order", active) VALUES
  ('Central Jersey Legal Services', 1, 1),
  ('Elijah''s Promise Inc.', 2, 1),
  ('Eric B. Chandler Health Center', 3, 1),
  ('George J. Otlowski Sr. Center for Mental Health Care', 4, 1),
  ('Hackensack Meridian Raritan Bay Medical Center', 5, 1),
  ('Hyacinth AIDS Foundation', 6, 1),
  ('New Brunswick Counseling Center', 7, 1),
  ('Northwest Jersey Legal Services', 8, 1),
  ('Robert Wood Johnson AIDS Program', 9, 1),
  ('Robert Wood Johnson Hospital Dental Program', 10, 1),
  ('Somerset Treatment Services', 11, 1),
  ('Visiting Nurse Association of Central New Jersey', 12, 1),
  ('Zufall Health Center - Somerset', 13, 1);

DELETE FROM committees;
INSERT INTO committees (label, "order", active) VALUES
  ('Planning Council (usually 1st Tuesday of each month 6-8pm)', 1, 1),
  ('Quality Improvement and Strategic Planning (every other month-3rd Tuesday 2-4pm)', 2, 1),
  ('Membership & Bylaws Committee (3rd Wednesday of each month 1-2pm)', 3, 1),
  ('Mentorship & Outreach (every other month- 2nd Wednesday 6-8pm)', 4, 1);
