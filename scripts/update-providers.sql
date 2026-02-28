-- =============================================================
-- SHU-518: Fix Provider Contact Info
-- SHU-529: Add Missing Provider (George J. Otlowski Sr. Center)
-- =============================================================
-- Run with:
--   cd /Users/kevincan/Desktop/ShuffleSEO/mshtga-backend
--   npx wrangler d1 execute hivconnect-db-production --env production --file ../mshtga/scripts/update-providers.sql --remote
-- =============================================================

-- 1. Raritan Bay Medical Center (ID: 7)
-- Phone: (732) 324-5000 → (732) 442-3700
-- Website: rwjbh.org 404 → hackensackmeridianhealth.org
UPDATE providers SET
  contact_phone = '(732) 442-3700',
  contact_website = 'https://www.hackensackmeridianhealth.org/en/locations/raritan-bay-medical-center',
  updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE id = 7;

-- 2. Somerset Treatment Services (ID: 3)
-- Phone: (908) 725-4900 → (908) 722-1232
-- Website: somersettreatment.org dead → stscares.org
-- Address: 118 Union Avenue → 118 West End Ave
UPDATE providers SET
  contact_phone = '(908) 722-1232',
  contact_website = 'https://www.stscares.org/',
  location_address = '118 West End Ave',
  updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE id = 3;

-- 3. Eric B. Chandler Health Center (ID: 1)
-- Phone: (732) 745-4500 → (732) 235-6700
-- Website: chandlerhealth.org wrong → rwjms.rutgers.edu
-- Address: 35 Commercial Avenue → 277 George Street
UPDATE providers SET
  contact_phone = '(732) 235-6700',
  contact_website = 'https://rwjms.rutgers.edu/eric-b-chandler-health-center',
  location_address = '277 George Street',
  updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE id = 1;

-- 4. Elijah's Promise (ID: 10)
-- Phone: (732) 545-8800 → (732) 545-9002
-- Address: 91 Elm Row → 18 Neilson St
UPDATE providers SET
  contact_phone = '(732) 545-9002',
  location_address = '18 Neilson St',
  updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE id = 10;

-- 5. VNAHG (ID: 8)
-- Phone: (732) 324-3600 → (800) 862-3330
UPDATE providers SET
  contact_phone = '(800) 862-3330',
  updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE id = 8;

-- 6. Zufall Health Center (ID: 5)
-- Phone: (973) 328-5000 → (844) 787-1846
-- Address: 10 Bassett Highway → 18 West Blackwell Street
UPDATE providers SET
  contact_phone = '(844) 787-1846',
  location_address = '18 West Blackwell Street',
  updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE id = 5;

-- 7. Zufall Health Mobile Dental Unit (ID: 14)
-- Phone: (973) 328-5000 → (844) 787-1846
UPDATE providers SET
  contact_phone = '(844) 787-1846',
  updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE id = 14;

-- 8. Legal Services of Northwest Jersey - Somerset (ID: 12)
-- Address: 190 West End Avenue → 90 E. Main St.
UPDATE providers SET
  location_address = '90 E. Main St.',
  updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE id = 12;

-- 9. NBCC (ID: 6) - website points to wrong org entirely
-- Current: https://www.nbcc.org (National Board for Certified Counselors)
-- Removing broken link until correct URL is verified
UPDATE providers SET
  contact_website = NULL,
  updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE id = 6;

-- =============================================================
-- SHU-529: Add George J. Otlowski Sr. Center for Mental Health Care
-- =============================================================
INSERT INTO providers (
  name, slug, description, type,
  location_address, location_city, location_state, location_zip_code, location_county,
  contact_phone, contact_phone24hr, contact_fax, contact_email, contact_website,
  hours_monday, hours_tuesday, hours_wednesday, hours_thursday, hours_friday, hours_saturday, hours_sunday,
  ryan_white, coordinates_lat, coordinates_lng, status,
  updated_at, created_at
) VALUES (
  'George J. Otlowski Sr. Center for Mental Health Care',
  'otlowski-mental-health-center',
  'Community mental health center providing HIV testing, mental health counseling, psychiatric services, and substance abuse treatment to Middlesex County residents.',
  'Mental Health',
  '570 Lee Street', 'Perth Amboy', 'NJ', '08861', 'middlesex',
  '(732) 442-1666', NULL, NULL, NULL, NULL,
  '08:30 - 17:00', '08:30 - 17:00', '08:30 - 17:00', '08:30 - 17:00', '08:30 - 17:00', 'Closed', 'Closed',
  1, 40.5068, -74.2654, 'active',
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
);

-- Add Ryan White parts for new provider
-- Note: this table uses `order`, `parent_id`, `value` (no underscores, autoincrement id)
INSERT INTO providers_ryan_white_parts (
  "order", parent_id, value
) VALUES (
  1,
  (SELECT id FROM providers WHERE slug = 'otlowski-mental-health-center'),
  'A'
);

-- Add services for new provider
-- Note: child tables use text id (hex string), _order, _parent_id
INSERT INTO providers_services_medical (id, _order, _parent_id, service)
VALUES ('a0b1c2d3e4f500000000aa01', 1, (SELECT id FROM providers WHERE slug = 'otlowski-mental-health-center'), 'Mental Health');

INSERT INTO providers_services_support (id, _order, _parent_id, service)
VALUES
  ('a0b1c2d3e4f500000000bb01', 1, (SELECT id FROM providers WHERE slug = 'otlowski-mental-health-center'), 'Mental Health'),
  ('a0b1c2d3e4f500000000bb02', 2, (SELECT id FROM providers WHERE slug = 'otlowski-mental-health-center'), 'Substance Abuse');

INSERT INTO providers_services_prevention (id, _order, _parent_id, service)
VALUES
  ('a0b1c2d3e4f500000000cc01', 1, (SELECT id FROM providers WHERE slug = 'otlowski-mental-health-center'), 'Hiv Testing'),
  ('a0b1c2d3e4f500000000cc02', 2, (SELECT id FROM providers WHERE slug = 'otlowski-mental-health-center'), 'Counseling');

-- Add languages
INSERT INTO providers_languages (id, _order, _parent_id, language)
VALUES
  ('a0b1c2d3e4f500000000dd01', 1, (SELECT id FROM providers WHERE slug = 'otlowski-mental-health-center'), 'English'),
  ('a0b1c2d3e4f500000000dd02', 2, (SELECT id FROM providers WHERE slug = 'otlowski-mental-health-center'), 'Spanish');

-- Add accessibility
INSERT INTO providers_accessibility (id, _order, _parent_id, feature)
VALUES
  ('a0b1c2d3e4f500000000ee01', 1, (SELECT id FROM providers WHERE slug = 'otlowski-mental-health-center'), 'Wheelchair'),
  ('a0b1c2d3e4f500000000ee02', 2, (SELECT id FROM providers WHERE slug = 'otlowski-mental-health-center'), 'Parking');

-- Add insurance accepted
INSERT INTO providers_insurance (id, _order, _parent_id, plan)
VALUES
  ('a0b1c2d3e4f500000000ff01', 1, (SELECT id FROM providers WHERE slug = 'otlowski-mental-health-center'), 'Medicaid'),
  ('a0b1c2d3e4f500000000ff02', 2, (SELECT id FROM providers WHERE slug = 'otlowski-mental-health-center'), 'Medicare'),
  ('a0b1c2d3e4f500000000ff03', 3, (SELECT id FROM providers WHERE slug = 'otlowski-mental-health-center'), 'Uninsured');

-- Add eligibility
INSERT INTO providers_eligibility (id, _order, _parent_id, requirement)
VALUES
  ('a0b1c2d3e4f500000000ab01', 1, (SELECT id FROM providers WHERE slug = 'otlowski-mental-health-center'), 'Adults'),
  ('a0b1c2d3e4f500000000ab02', 2, (SELECT id FROM providers WHERE slug = 'otlowski-mental-health-center'), 'Local residents');
