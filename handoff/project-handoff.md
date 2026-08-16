# The Collector — Project Handoff

## Live app
- **URL**: https://the-collector-sigma.vercel.app
- **Login**: Supabase email/password (account created by owner via dashboard)
- **Stack**: React 18 + Vite 5, Supabase (PostgreSQL + Storage), Vercel, vite-plugin-pwa

---

## Infrastructure

### Supabase
- **Project**: `the-collector`
- **Project ID**: `oidnhbmhjzcrvyjjfmes`
- **Region**: eu-west-2
- **URL**: `https://oidnhbmhjzcrvyjjfmes.supabase.co`
- **Anon key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pZG5oYm1oanpjcnZ5ampmbWVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY3MDkzMTQsImV4cCI6MjEwMjI4NTMxNH0.AsbL808lqFu8FlDaSrio1K1c4P614MKWUdmBgZUA-Dw`

### Vercel
- **Project**: `mgplayground-5562s-projects/the-collector`
- **Org**: `mgplayground-5562`
- Env vars set permanently in Vercel project: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- `vercel deploy --prod --yes` redeploys from `/Users/mauro/Apps/Collector`

### Supabase org note
- `mobus-os` project was paused to free up the free tier 2-active-project cap. Resume it from the Supabase dashboard when needed.

---

## What's built

### Database schema (3 tables, all with RLS)
```sql
items (
  id uuid PK, name text, status text CHECK('owned','watchlist','sold'),
  category text CHECK('pokemon','yugioh','dragonball','riftbound','other'),
  grade_company text, grade text, is_raw boolean,
  purchase_price numeric(10,2), purchase_date date,
  current_value numeric(10,2), quantity int,
  seller_source text, cert_number text, image_url text,
  sale_price numeric(10,2), sale_date date, notes text,
  created_at timestamptz, updated_at timestamptz
)

price_history (
  id uuid PK, item_id uuid FK→items(id) CASCADE,
  price numeric(10,2), note text, recorded_at timestamptz
)

release_calendar (
  id uuid PK, name text, game text, release_date date,
  region text, note text, created_at timestamptz
)
```
- `updated_at` trigger on items
- RLS: all tables, `authenticated` users can do everything

### Seed data (already in DB)
- Umbreon ex 161/131 PSA 9 — £1,050, cert #140842521
- Sylveon VMAX 212/203 PSA 9 — £278.64
- Blue-Eyes White Dragon LOB-001 PSA 8 — £250 (note: not LOB-E001)
- Vegito Super Saiyan #125 PSA 8 — £450 (history: £175 Aug 2025 → £450 Jul 2026)
- Riftbound Vendetta Booster Box — £119.95, raw, Obsidia TCG
- 7 Riftbound release calendar entries (Origins through The Reckoning)

### Key invariant — paired price write
`logPrice(itemId, price, note)` in `src/services/priceHistory.js` always:
1. Inserts into `price_history`
2. Updates `items.current_value`
3. If step 2 fails → deletes the orphaned history row (compensating rollback)
Never update `current_value` directly.

---

## App features (all complete)

### Collection tab
- Filterable item list: status, category, min/max £, sort (date/value/gain%)
- Item cards: name, grade, current value, gain % colour-coded (teal gain, brick loss)
- Add/edit form: all 16 schema fields, is_raw nulls grade fields, sold shows sale fields
- Item detail: Recharts price history chart (≥2 points), price log, notes, log-price form
- Stale value fix: logging a price calls `onPriceLogged` → refetch live

### Analytics tab
- **Hero stats**: Cost basis | Portfolio value (large), Unrealized gain | Realized gain (secondary)
- **Highlights**: Most Valuable (top 3 by £), Trending (top 3 by 30-day absolute move)
- **Portfolio chart**: timeline with 1W / 1M / All pill filter
- **Category donut**: Recharts pie chart by category
- **Gainers & losers**: top 3 positive gainers, worst 3 losers by gain %

### Calendar tab
- Riftbound release schedule, countdown to next release
- Add/edit/delete releases

### PWA
- App name: "The Collector" everywhere
- Icons: brass-gold "C" ring on ink navy, teal center dot
  - icon-192.png, icon-512.png (purpose: any)
  - icon-512-maskable.png (purpose: maskable, safe-zone padded)
  - apple-touch-icon.png (180px)
  - favicon.svg + favicon.png (32px)
- Manifest: split "any" and "maskable" as separate entries
- Install via Safari → Share → Add to Home Screen

---

## Design system

All values as CSS custom properties in `src/styles/tokens.css`:

```
--bg-base:     #0d1b2a   (ink navy)
--bg-surface:  #132338
--bg-elevated: #1a2f47
--border:      #1e3a52
--gold:        #c9a84c   (brass gold — UI accent)
--gain:        #4ecdc4   (teal)
--loss:        #e07a5f   (brick red)
--text-1:      #f0ebe3
--text-2:      #8fa8c0
--text-3:      #4d6a82
--font-display: 'Fraunces', Georgia, serif
--font-body:    'Inter', system-ui, sans-serif
--font-mono:    'IBM Plex Mono', monospace
--nav-height: 56px
```

PWA icon background: `#14141a` (slightly darker than --bg-base)
PWA icon ring: `#c9a15a` (brass, slightly different shade)

---

## File structure

```
src/
  App.jsx                         auth gate + router
  main.jsx
  styles/
    tokens.css                    all CSS custom properties
    global.css                    resets, base styles, all utility classes
  lib/
    supabase.js                   singleton Supabase client
  services/
    items.js                      CRUD for items table
    priceHistory.js               paired logPrice (with rollback)
    analytics.js                  getAnalyticsData() — all analytics computed here
    releaseCalendar.js            CRUD for release_calendar
  hooks/
    useAuth.js                    session, signIn, signOut
    useItems.js                   items list + mutations (filters serialized for deps)
    usePriceHistory.js            price history per item + logPrice
    useReleaseCalendar.js         calendar list + mutations
  components/
    ui/
      Modal.jsx, Badge.jsx, EmptyState.jsx
    layout/
      Shell.jsx, Nav.jsx
    auth/
      LoginScreen.jsx
    collection/
      ItemCard.jsx                card tile with gain % colour coding
      ItemList.jsx
      ItemFilters.jsx             status / category / min£ / max£ / sort
      ItemForm.jsx                add/edit form, all 16 fields, confirm-delete
      ItemDetail.jsx              price chart, log, notes, log-price form
      LogPriceForm.jsx
    analytics/
      PortfolioSummary.jsx        hero cost-basis vs portfolio value
      PortfolioChart.jsx          timeline chart with 1W/1M/All range filter
      CategoryBreakdown.jsx       Recharts donut
      GainersLosers.jsx           top 3 / worst 3
      Highlights.jsx              most valuable + trending (30-day)
    calendar/
      CalendarList.jsx            past/next/upcoming with countdown
      ReleaseForm.jsx
  pages/
    CollectionPage.jsx
    AnalyticsPage.jsx
    CalendarPage.jsx
public/
  icons/
    icon-192.png, icon-512.png, icon-512-maskable.png
  apple-touch-icon.png
  favicon.svg, favicon.png
supabase/
  migrations/001_initial_schema.sql
  seed.sql
```

---

## Next feature: Vault (in discussion, not started)

### What the user wants
- A new section ("Vault") to visually showcase the physical collection
- Ability to photograph cards and packs directly in the app
- Cards render with a 3D tilt + holographic shimmer animation
- Packs/booster boxes displayed differently (product-shot style)

### Research findings

**Card animation** — best reference: [`simeydotme/pokemon-cards-css`](https://github.com/simeydotme/pokemon-cards-css)
- Realistic holographic shimmer, 3D tilt tracking pointer/touch, foil overlays
- Uses vanilla-tilt.js (~2KB) for 3D rotation
- Pure CSS + JS, framework-agnostic, can use any card image (not just official art)

**Camera capture**
- Android PWA: `<input type="file" accept="image/*" capture="environment">` works fine
- iOS installed PWA (home screen): `<input capture>` is broken
- Fix: use `navigator.mediaDevices.getUserMedia()` — works in iOS PWA since iOS 11.3
- Library option: `react-webcam` abstracts cross-browser handling
- Recommendation: implement getUserMedia for consistent iOS + Android PWA support

**Image storage** — Supabase Storage
- Free tier: 50MB/file, 1GB total
- Upload: `supabase.storage.from('card-images').upload(path, file)`
- Public CDN URL → save to `items.image_url` (field already exists)
- RLS: bucket policy so only authenticated user can upload
- No backend needed — browser uploads directly

### Open decisions (user hasn't answered yet)
1. **Item type tracking**: add new `item_type` column (`graded_card` / `raw_card` / `booster_pack` / `booster_box` / `sealed_other`) to drive different Vault display treatments? Or infer from existing `is_raw` + name?
2. **Vault placement**: new fifth tab, or a view toggle within the existing Collection tab?
3. **Pack animation style**: same 3D tilt as cards, or a different effect (hover lift, product spin)?
4. **Photo rollout**: build camera first and populate as you go, or implement Vault display first using placeholder art?

---

## Repo
- Local: `/Users/mauro/Apps/Collector`
- Branch: `main` (all work committed directly, no feature branches)
- No test suite configured (React SPA, manual testing)
- Latest commits:
  - `cc81054` feat: real PWA icons — brass-gold C ring on navy, teal center dot
  - `4cb44b2` feat: portfolio chart time-range filter (1W / 1M / All)
  - `1ab84a8` feat: analytics highlights — most valuable and trending sections
  - `433dd32` feat: cost basis as hero stat in analytics summary
  - `c8848b2` fix: value-range filter UI, gain% sort, stale current_value after logPrice
