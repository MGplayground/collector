-- Applied to project oidnhbmhjzcrvyjjfmes on 2026-08-17.
-- The resale (Depop) module. Deliberately shares no tables with the card
-- tracker and holds no foreign key to it — see docs/resale-module-spec.md.

create table resale_items (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name        text not null,
  category    text not null check (category in ('clothing','cards','sealed','other')),
  attributes  jsonb not null default '{}'::jsonb,
  condition   text check (condition in ('new_with_tags','excellent','good','fair','worn')),
  cost        numeric(10,2),
  acquired_at date,
  source      text,
  location    text,
  state       text not null default 'draft' check (state in ('draft','ready','listed','sold','archived')),
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table resale_photos (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null references auth.users(id) on delete cascade default auth.uid(),
  item_id        uuid not null references resale_items(id) on delete cascade,
  storage_path   text not null,
  processed_path text,
  position       int  not null default 0,
  created_at     timestamptz not null default now(),
  -- deferrable so a drag-reorder can renumber within one transaction
  constraint resale_photos_position_unique unique (item_id, position) deferrable initially deferred
);

create table resale_templates (
  id                   uuid primary key default gen_random_uuid(),
  owner_id             uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name                 text not null,
  category             text not null check (category in ('clothing','cards','sealed','other')),
  title_template       text not null,
  description_template text not null,
  hashtags             text[] not null default '{}',
  created_at           timestamptz not null default now()
);

create table resale_listings (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null references auth.users(id) on delete cascade default auth.uid(),
  item_id        uuid not null references resale_items(id) on delete cascade,
  platform       text not null default 'depop' check (platform in ('depop')),
  state          text not null default 'draft' check (state in ('draft','listed','sold','delisted')),
  title          text,
  description    text,
  hashtags       text[] not null default '{}',
  price          numeric(10,2),
  external_url   text,
  listed_at      timestamptz,
  last_bumped_at timestamptz,
  bump_days      int not null default 3 check (bump_days between 1 and 60),
  sold_at        timestamptz,
  sold_price     numeric(10,2),
  platform_fee   numeric(10,2),
  shipping_cost  numeric(10,2),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- At most one live listing per unit per platform. This is the structural fix for
-- duplicate listings; application code cannot bypass it.
create unique index resale_one_live_listing on resale_listings (item_id, platform) where state = 'listed';

create table resale_listing_events (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users(id) on delete cascade default auth.uid(),
  listing_id uuid not null references resale_listings(id) on delete cascade,
  event      text not null check (event in ('created','published','bumped','price_changed','sold','delisted','relisted')),
  detail     jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table resale_items          enable row level security;
alter table resale_photos         enable row level security;
alter table resale_templates      enable row level security;
alter table resale_listings       enable row level security;
alter table resale_listing_events enable row level security;

create policy "owner_rw" on resale_items          for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owner_rw" on resale_photos         for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owner_rw" on resale_templates      for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owner_rw" on resale_listings       for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owner_rw" on resale_listing_events for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create index resale_items_owner_idx            on resale_items (owner_id);
create index resale_items_state_idx            on resale_items (owner_id, state);
create index resale_photos_item_idx            on resale_photos (item_id, position);
create index resale_listings_item_idx          on resale_listings (item_id);
create index resale_listings_bump_idx          on resale_listings (owner_id, state, last_bumped_at);
create index resale_listing_events_listing_idx on resale_listing_events (listing_id, created_at desc);

create trigger resale_items_updated_at    before update on resale_items    for each row execute function update_updated_at();
create trigger resale_listings_updated_at before update on resale_listings for each row execute function update_updated_at();
