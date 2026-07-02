-- Test seed data for integration tests
-- IDs are deterministic and match tests/.env values

-- User
INSERT INTO users (id, email, name, picture, google_id)
VALUES (
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  'test@rumaq.dev',
  'Test User',
  NULL,
  'google-test-123'
);

-- Household
INSERT INTO households (id, name, created_by)
VALUES (
  '11111111-2222-3333-4444-555555555555',
  'Test Household',
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
);

-- Household membership
INSERT INTO household_members (household_id, user_id, role)
VALUES (
  '11111111-2222-3333-4444-555555555555',
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  'owner'
);

-- User settings (with active household)
INSERT INTO user_settings (id, user_id, active_household_id)
VALUES (
  'ssssssss-0000-0000-0000-000000000001',
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  '11111111-2222-3333-4444-555555555555'
);

-- Locations
INSERT INTO locations (id, household_id, label, sort_order) VALUES
  ('loc-kitchen', '11111111-2222-3333-4444-555555555555', 'Kitchen',       1),
  ('loc-fridge',  '11111111-2222-3333-4444-555555555555', 'Fridge',         2),
  ('loc-pantry',  '11111111-2222-3333-4444-555555555555', 'Pantry',         3);

-- Stores
INSERT INTO stores (id, household_id, label) VALUES
  ('store-indo',    '11111111-2222-3333-4444-555555555555', 'Indomaret'),
  ('store-super',    '11111111-2222-3333-4444-555555555555', 'Superindo');

-- Items
INSERT INTO items (id, household_id, name, default_unit, category) VALUES
  ('item-rice',     '11111111-2222-3333-4444-555555555555', 'Rice',            'kg',  'grains'),
  ('item-oil',      '11111111-2222-3333-4444-555555555555', 'Cooking Oil',    'L',   'cooking'),
  ('item-egg',      '11111111-2222-3333-4444-555555555555', 'Eggs',           'pcs', 'protein'),
  ('item-milk',     '11111111-2222-3333-4444-555555555555', 'Milk',           'L',   'dairy'),
  ('item-sugar',    '11111111-2222-3333-4444-555555555555', 'Sugar',          'kg',  'cooking');

-- Stock (3 items in stock, varying urgency)
INSERT INTO stock (id, household_id, item_id, location_id, qty, unit, run_out_days, updated_at) VALUES
  ('stock-rice',  '11111111-2222-3333-4444-555555555555', 'item-rice',  'loc-pantry',  2.0,  'kg',   14,  datetime('now')),
  ('stock-oil',   '11111111-2222-3333-4444-555555555555', 'item-oil',   'loc-kitchen', 0.5,  'L',    3,   datetime('now')),
  ('stock-egg',   '11111111-2222-3333-4444-555555555555', 'item-egg',   'loc-fridge',  10,   'pcs',  7,   datetime('now'));
