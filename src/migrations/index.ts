import * as migration_20250929_111647 from './20250929_111647';
import * as migration_20251203_123731 from './20251203_123731';
import * as migration_20251210_014000_add_faqs_pages_collections from './20251210_014000_add_faqs_pages_collections';
import * as migration_20251210_211128_add_membership_applications from './20251210_211128_add_membership_applications';
import * as migration_20251211_143325_add_events_collection from './20251211_143325_add_events_collection';
import * as migration_20251211_152317_add_event_coordinates from './20251211_152317_add_event_coordinates';
import * as migration_20251212_172450 from './20251212_172450';
import * as migration_20251217_193451_add_bylaws_service_standards from './20251217_193451_add_bylaws_service_standards';

export const migrations = [
  {
    up: migration_20250929_111647.up,
    down: migration_20250929_111647.down,
    name: '20250929_111647',
  },
  {
    up: migration_20251203_123731.up,
    down: migration_20251203_123731.down,
    name: '20251203_123731',
  },
  {
    up: migration_20251210_014000_add_faqs_pages_collections.up,
    down: migration_20251210_014000_add_faqs_pages_collections.down,
    name: '20251210_014000_add_faqs_pages_collections',
  },
  {
    up: migration_20251210_211128_add_membership_applications.up,
    down: migration_20251210_211128_add_membership_applications.down,
    name: '20251210_211128_add_membership_applications',
  },
  {
    up: migration_20251211_143325_add_events_collection.up,
    down: migration_20251211_143325_add_events_collection.down,
    name: '20251211_143325_add_events_collection',
  },
  {
    up: migration_20251211_152317_add_event_coordinates.up,
    down: migration_20251211_152317_add_event_coordinates.down,
    name: '20251211_152317_add_event_coordinates',
  },
  {
    up: migration_20251212_172450.up,
    down: migration_20251212_172450.down,
    name: '20251212_172450',
  },
  {
    up: migration_20251217_193451_add_bylaws_service_standards.up,
    down: migration_20251217_193451_add_bylaws_service_standards.down,
    name: '20251217_193451_add_bylaws_service_standards'
  },
];
