# Resale (Depop) module — backend spec

Design agreed before build. Nothing here is implemented yet.

## Decisions

| Question | Decision | Why |
|---|---|---|
| Depop API | **Not used** | The Selling API is Pro-seller gated; no Pro account. Build no adapter for a thing that isn't coming. |
| Server/cron | **None added** | Without the API there is nothing to execute on a schedule. "What's due to bump" is a query, not a job. |
| Shared `items` table | **No** | Card columns (grade, cert, is_raw) are meaningless for a jacket. Two focused tables beat one sparse one. |
| Link to collection | **No FK** | Cards held as stock are a separate record from cards in the collection. A nullable FK is trivial to add later if that changes. |
| Stock granularity | **One row per physical unit** | Each unit needs its own photos and its own listing. Depop is one item per listing. |
| Bump interval | **Per-item, default 3 days** | |
| Navigation | **4 tabs**: Collection / Resale / Analytics / Calendar | |
| Multi-user | **`owner_id` + real RLS on both modules now** | 5 rows today, painful later. |

### Explicitly out of scope
- Any Depop API integration, OAuth, or webhooks
- Browser automation / bots against Depop (account-ban risk, breaches their terms)
- Cross-platform posting (eBay, Vinted)
- Background *removal* from photos (v2 — needs a paid API or heavy WASM model)
- Push notifications (v2 — the only future reason to add a server)

---

## Migration 005 — owner_id and real RLS

Current state: every table has one policy named `owner_all` granting `ALL` to `authenticated`
with no ownership check. One account exists (`mauro@col.io`), and there are 5 items.

```sql
-- Card tracker tables
alter table items            add column owner_id uuid references auth.users(id) on delete cascade;
alter table price_history    add column owner_id uuid references auth.users(id) on delete cascade;
alter table release_calendar add column owner_id uuid references auth.users(id) on delete cascade;

-- Backfill: single-account app today, so all existing rows belong to the only user.
-- Verified before running: select count(*) from auth.users = 1.
update items            set owner_id = (select id from auth.users order by created_at limit 1);
update price_history    set owner_id = (select id from auth.users order by created_at limit 1);
update release_calendar set owner_id = (select id from auth.users order by created_at limit 1);

alter table items            alter column owner_id set not null, alter column owner_id set default auth.uid();
alter table price_history    alter column owner_id set not null, alter column owner_id set default auth.uid();
alter table release_calendar alter column owner_id set not null, alter column owner_id set default auth.uid();

-- Replace the permissive policies with real ownership checks
drop policy "owner_all" on items;
drop policy "owner_all" on price_history;
drop policy "owner_all" on release_calendar;

create policy "owner_rw" on items            for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owner_rw" on price_history    for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owner_rw" on release_calendar for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create index on items (owner_id);
create index on price_history (owner_id);
create index on release_calendar (owner_id);
```

**Client impact:** none. `owner_id` defaults to `auth.uid()`, so inserts need no change.

---

## Migration 006 — resale schema

`resale_` prefix in `public`. Same RLS pattern throughout (omitted below for brevity —
every table gets `owner_id`, the `owner_rw` policy, and an index).

```sql
create table resale_items (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name         text not null,
  category     text not null check (category in ('clothing','cards','sealed','other')),
  attributes   jsonb not null default '{}'::jsonb,
  condition    text check (condition in ('new_with_tags','excellent','good','fair','worn')),
  cost         numeric(10,2),
  acquired_at  date,
  source       text,
  location     text,
  state        text not null default 'draft'
               check (state in ('draft','ready','listed','sold','archived')),
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table resale_photos (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null references auth.users(id) on delete cascade default auth.uid(),
  item_id        uuid not null references resale_items(id) on delete cascade,
  storage_path   text not null,           -- original in the resale-photos bucket
  processed_path text,                    -- normalised square, null until processed
  position       int  not null default 0,
  created_at     timestamptz not null default now(),
  unique (item_id, position)
);

create table resale_templates (
  id                   uuid primary key default gen_random_uuid(),
  owner_id             uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name                 text not null,
  category             text not null,
  title_template       text not null,     -- "{{brand}} {{name}} — {{size}}"
  description_template text not null,
  hashtags             text[] not null default '{}',
  created_at           timestamptz not null default now()
);

create table resale_listings (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null references auth.users(id) on delete cascade default auth.uid(),
  item_id        uuid not null references resale_items(id) on delete cascade,
  platform       text not null default 'depop' check (platform in ('depop')),
  state          text not null default 'draft'
                 check (state in ('draft','listed','sold','delisted')),
  title          text,
  description    text,
  hashtags       text[] not null default '{}',
  price          numeric(10,2),
  external_url   text,                    -- pasted after publishing by hand
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

-- One live listing per unit per platform. Structural, not enforced in app code.
create unique index resale_one_live_listing
  on resale_listings (item_id, platform)
  where state = 'listed';

create table resale_listing_events (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users(id) on delete cascade default auth.uid(),
  listing_id uuid not null references resale_listings(id) on delete cascade,
  event      text not null check (event in
             ('created','published','bumped','price_changed','sold','delisted','relisted')),
  detail     jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
```

Storage: a second bucket `resale-photos`, same policy shape as `card-images`
(authenticated write, public read, 5 MB cap).

---

## Domain logic — `src/domain/resale/`

Pure modules, no Supabase imports, following the pattern established in
`src/domain/` (see `docs/audit-2026-08.md` for why that separation exists).

### `state.js` — the listing state machine

```
draft ──publish──> listed ──sold──> sold        (terminal)
                     │  ↑
                  bump│  │relist
                     ↓  │
                   delisted
```

Rules, all unit-testable without a database:

- `canPublish(item, listing)` — requires ≥1 photo, a rendered title, a description, and a price.
  Returns the list of missing things, not a boolean, so the UI can say what's wrong.
- `canBump(listing)` — only from `listed`. A sold or delisted listing can never be bumped.
- `nextBumpAt(listing)` = `(last_bumped_at ?? listed_at) + bump_days`.
- `isDueForBump(listing, now)` — `state === 'listed' && nextBumpAt <= now`.
- Selling sets `resale_items.state = 'sold'` in the same transaction as the listing.

**The sold-during-bump race:** the bump action re-reads listing state inside the update
(`update ... where id = $1 and state = 'listed'`) and treats a zero-row result as
"already gone", not as success.

### `templates.js` — copy generation

- `render(template, item)` — `{{placeholder}}` resolved against `item.attributes` plus
  top-level fields. An unresolved placeholder is an error surfaced in the UI, never
  silently left as `{{brand}}` in a live listing.
- `validate(rendered)` — enforces Depop's title/description length caps and hashtag count.
  **Confirm the actual limits at build time** rather than guessing; the validator is the
  single place they live.

### `profit.js` — money

```
net = sold_price − cost − platform_fee − shipping_cost
```

Reuses `formatMoney` from `src/domain/money.js`. `platform_fee` is stored per listing
rather than computed from a hardcoded rate, because Depop's rate has changed before and
historical sales must keep the fee that actually applied.

**Never combine resale net profit with collection unrealized gain into a single figure.**
One is realised and net of fees; the other is neither.

---

## The flow, without an API

1. **Intake** — photos + minimal details in, one `resale_items` row per unit.
2. **Normalise photos** — client-side canvas, same approach as `src/lib/imageCompress.js`:
   fixed square aspect, padding, consistent background colour. Deterministic and free.
3. **Generate copy** — template renders title, description, hashtags. Editable, then saved
   onto the listing so it is reproducible.
4. **Publish** — copy-to-clipboard per field, photos saveable to camera roll. You paste into
   the Depop app and publish. Back in the hub, mark **Listed** and paste the URL.
5. **Bump worklist** — the Resale tab shows what is due. Tapping "Bumped" stamps
   `last_bumped_at` and writes an event.
6. **Sold** — marked by hand; captures sale price, fee and shipping, and closes the item.

Every step writes to `resale_listing_events`, so "why is this listing missing?" is answerable.

---

## Module boundaries

- No resale table references a card-tracker table, and no card-tracker code imports
  `domain/resale/`.
- Shared surface is exactly: `auth.users`, `src/domain/money.js`, the storage/RLS
  conventions, and the dashboard that reads both.
- The dashboard composes two independent queries. It does not join across modules.

## Build order

1. Migration 005 (`owner_id` + RLS) — verify the app still works before anything else.
2. Migration 006 + storage bucket.
3. `domain/resale/` with unit tests — state machine, templates, profit. No UI.
4. Services and hooks.
5. Intake + photo normalisation UI.
6. Listing composer, publish flow, bump worklist.
7. Dashboard tile for both modules.

Steps 1–3 are the load-bearing ones; everything after is assembly against tested logic.
