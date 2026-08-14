-- supabase/seed.sql
-- Run in Supabase SQL editor AFTER the schema migration.

DO $$
DECLARE
  umbreon_id   uuid;
  sylveon_id   uuid;
  bewd_id      uuid;
  vegito_id    uuid;
  vendetta_id  uuid;
BEGIN

  INSERT INTO items (name, category, status, is_raw, grade_company, grade, current_value, cert_number, purchase_date)
  VALUES ('Umbreon ex 161/131 (Prismatic Evolutions)', 'pokemon', 'watchlist', false, 'PSA', '9', 1050.00, '140842521', NULL)
  RETURNING id INTO umbreon_id;

  INSERT INTO items (name, category, status, is_raw, grade_company, grade, current_value, purchase_date)
  VALUES ('Sylveon VMAX 212/203 (Evolving Skies)', 'pokemon', 'watchlist', false, 'PSA', '9', 278.64, NULL)
  RETURNING id INTO sylveon_id;

  INSERT INTO items (name, category, status, is_raw, grade_company, grade, current_value, purchase_date,
    notes)
  VALUES ('Blue-Eyes White Dragon LOB-001 Unlimited', 'yugioh', 'watchlist', false, 'PSA', '8', 250.00, NULL,
    'Must not be confused with LOB-E001 — different/cheaper European print.')
  RETURNING id INTO bewd_id;

  INSERT INTO items (name, category, status, is_raw, grade_company, grade, current_value, purchase_date)
  VALUES ('Vegito, Super Saiyan #125 (DBZ Score CCG, Fusion Saga)', 'dragonball', 'watchlist', false, 'PSA', '8', 450.00, NULL)
  RETURNING id INTO vegito_id;

  INSERT INTO items (name, category, status, is_raw, current_value, seller_source,
    notes)
  VALUES ('Riftbound Vendetta Booster Box', 'riftbound', 'watchlist', true, 119.95, 'Obsidia TCG',
    'Sourced via Obsidia lottery allocation — not a straight purchase.')
  RETURNING id INTO vendetta_id;

  -- Vegito historical price points
  INSERT INTO price_history (item_id, price, recorded_at, note) VALUES
    (vegito_id, 175.00, '2025-08-01 00:00:00+00', 'Historical price Aug 2025'),
    (vegito_id, 450.00, '2026-07-01 00:00:00+00', 'Historical price Jul 2026');

  -- Umbreon initial price snapshot
  INSERT INTO price_history (item_id, price, recorded_at, note) VALUES
    (umbreon_id, 1050.00, now(), 'Initial value — negotiation target £950–1,000');

END $$;

-- Release calendar
INSERT INTO release_calendar (name, game, release_date, region, note) VALUES
  ('Origins',       'Riftbound', '2025-10-31', 'Global', NULL),
  ('Spiritforged',  'Riftbound', '2026-02-13', 'Global', NULL),
  ('Unleashed',     'Riftbound', '2026-05-08', 'Global', NULL),
  ('Vendetta',      'Riftbound', '2026-07-31', 'Global', NULL),
  ('Radiance',      'Riftbound', '2026-10-23', 'Global', 'Reveals begin 21 Sep 2026'),
  ('Legacy',        'Riftbound', '2027-01-29', 'Global', NULL),
  ('The Reckoning', 'Riftbound', '2027-04-30', 'Global', NULL);
