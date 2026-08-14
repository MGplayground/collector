-- supabase/migrations/001_initial_schema.sql

CREATE TABLE items (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text NOT NULL,
  status         text NOT NULL CHECK (status IN ('owned','watchlist','sold')),
  category       text NOT NULL CHECK (category IN ('pokemon','yugioh','dragonball','riftbound','other')),
  grade_company  text,
  grade          text,
  is_raw         boolean NOT NULL DEFAULT false,
  purchase_price numeric(10,2),
  purchase_date  date,
  current_value  numeric(10,2),
  quantity       integer NOT NULL DEFAULT 1,
  seller_source  text,
  cert_number    text,
  image_url      text,
  sale_price     numeric(10,2),
  sale_date      date,
  notes          text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE price_history (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id     uuid NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  price       numeric(10,2) NOT NULL,
  note        text,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE release_calendar (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  game         text,
  release_date date NOT NULL,
  region       text,
  note         text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Auto-update updated_at on items
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER items_updated_at
  BEFORE UPDATE ON items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Row Level Security
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE release_calendar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_all" ON items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "owner_all" ON price_history
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "owner_all" ON release_calendar
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
