# The Collector — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a personal trading card collection tracker — "The Collector" — as an installable PWA deployed on Vercel, with Supabase for data persistence and a premium ink-navy/brass-gold aesthetic.

**Architecture:** React + Vite SPA deployed to Vercel; all data access goes through the Supabase JS client directly from the browser (no custom backend). Row Level Security on all tables ensures only the authenticated owner can read or write data. Navigation is handled by React Router; charts use Recharts.

**Tech Stack:** React 18, Vite 5, React Router 6, Supabase JS v2, Recharts 2, vite-plugin-pwa, date-fns, Inter + Fraunces + IBM Plex Mono (Google Fonts).

## Global Constraints

- App name everywhere: "The Collector" (PWA manifest name, short_name, page title, splash screen)
- Currency: GBP (£) throughout — no currency switching
- All prices stored as `numeric(10,2)` in Supabase; displayed with `£` prefix and 2 decimal places
- Category enum values (stored lowercase): `pokemon`, `yugioh`, `dragonball`, `riftbound`, `other`
- Status enum values (stored lowercase): `owned`, `watchlist`, `sold`
- No CSV export in v1 — out of scope
- No file upload — image URLs only (paste a link)
- Mobile-first responsive layout; primary breakpoint at 768px
- Design direction A: ink navy (`#0d1b2a`) base, brass gold (`#c9a84c`) accent — no cream-and-terracotta, no neon-on-near-black defaults
- Auth: single Supabase email/password account; RLS on all tables; session persists via Supabase's built-in session storage

---

## File Map

```
/
├── public/
│   ├── manifest.json
│   └── icons/
│       ├── icon-192.png          (placeholder — replace with real icon)
│       └── icon-512.png
├── src/
│   ├── main.jsx                  entry point, mounts App
│   ├── App.jsx                   auth gate + router
│   ├── styles/
│   │   ├── tokens.css            CSS custom properties (colours, type, spacing)
│   │   └── global.css            resets + base element styles
│   ├── lib/
│   │   └── supabase.js           singleton supabase client
│   ├── services/
│   │   ├── items.js              CRUD for items table
│   │   ├── priceHistory.js       paired price log (inserts history + updates item)
│   │   └── releaseCalendar.js    CRUD for release_calendar
│   ├── hooks/
│   │   ├── useAuth.js            session state, signIn, signOut
│   │   ├── useItems.js           items list + mutations
│   │   ├── usePriceHistory.js    price history per item
│   │   └── useReleaseCalendar.js release calendar list + mutations
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Button.jsx
│   │   │   ├── Input.jsx
│   │   │   ├── Select.jsx
│   │   │   ├── Modal.jsx
│   │   │   ├── Badge.jsx         status + category pill badges
│   │   │   └── EmptyState.jsx
│   │   ├── layout/
│   │   │   ├── Shell.jsx         outer chrome: header + bottom nav + page area
│   │   │   └── Nav.jsx           tab navigation (bottom on mobile, top on desktop)
│   │   ├── auth/
│   │   │   └── LoginScreen.jsx
│   │   ├── collection/
│   │   │   ├── ItemCard.jsx      card in the list
│   │   │   ├── ItemList.jsx      filtered + sorted list of ItemCards
│   │   │   ├── ItemFilters.jsx   filter bar (category, status, value range, sort)
│   │   │   ├── ItemForm.jsx      add/edit modal form (all schema fields)
│   │   │   ├── LogPriceForm.jsx  "log new price" modal (price + note)
│   │   │   └── ItemDetail.jsx    full detail view: chart + notes history
│   │   ├── analytics/
│   │   │   ├── PortfolioSummary.jsx   headline stats row
│   │   │   ├── CategoryBreakdown.jsx  donut chart + legend
│   │   │   ├── PortfolioChart.jsx     aggregate value over time line chart
│   │   │   └── GainersLosers.jsx      top 3 gainers + losers ranked by %
│   │   └── calendar/
│   │       ├── CalendarList.jsx  list of releases with countdown
│   │       └── ReleaseForm.jsx   add/edit release modal
│   └── pages/
│       ├── CollectionPage.jsx    wires ItemFilters + ItemList + ItemDetail
│       ├── AnalyticsPage.jsx     wires all analytics components
│       └── CalendarPage.jsx      wires CalendarList + ReleaseForm
├── supabase/
│   ├── migrations/
│   │   └── 001_initial_schema.sql
│   └── seed.sql
├── index.html
├── vite.config.js
├── .env.example
└── vercel.json
```

---

## Task 1: Supabase schema + seed data

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`
- Create: `supabase/seed.sql`

**Interfaces:**
- Produces: three tables (`items`, `price_history`, `release_calendar`) with RLS; seed data for 5 items and 7 calendar entries

- [ ] **Step 1: Write the migration file**

```sql
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
```

- [ ] **Step 2: Apply the migration in Supabase**

In the Supabase dashboard → SQL editor, paste and run the full contents of `001_initial_schema.sql`.
Verify: Tables tab shows `items`, `price_history`, `release_calendar`.
Verify: Authentication → Policies shows `owner_all` on all three tables.

- [ ] **Step 3: Write the seed file**

```sql
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
```

- [ ] **Step 4: Run the seed in Supabase SQL editor**

Paste and run `seed.sql`. Verify in Table Editor:
- `items`: 5 rows
- `price_history`: 3 rows (2 Vegito, 1 Umbreon)
- `release_calendar`: 7 rows

- [ ] **Step 5: Note your Supabase project URL and anon key**

Supabase dashboard → Settings → API:
- `Project URL` → save as `VITE_SUPABASE_URL`
- `anon public` key → save as `VITE_SUPABASE_ANON_KEY`

You'll also need to create one Supabase auth user (the owner account):
Authentication → Users → Add user → enter your email + password. This is the only account that will ever log in.

- [ ] **Step 6: Commit**

```bash
git add supabase/
git commit -m "feat: initial schema migration and seed data"
```

---

## Task 2: Project scaffold + environment

**Files:**
- Create: `package.json`, `vite.config.js`, `index.html`, `.env.example`, `src/main.jsx`, `src/App.jsx` (stub)

**Interfaces:**
- Produces: running Vite dev server at localhost:5173; `supabase` client importable from `src/lib/supabase.js`

- [ ] **Step 1: Initialise Vite + React project**

```bash
cd /Users/mauro/Apps/Collector
npm create vite@latest . -- --template react
npm install
```

Accept overwrite prompt if asked (directory already has files).

- [ ] **Step 2: Install dependencies**

```bash
npm install @supabase/supabase-js react-router-dom recharts date-fns
npm install -D vite-plugin-pwa
```

Check publish dates before installing — all of these are established packages (supabase-js, react-router-dom, recharts, date-fns, vite-plugin-pwa). Run `npm view <package> time.modified` if unsure.

- [ ] **Step 3: Write `.env.example`**

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Copy to `.env.local` and fill in real values from Task 1 Step 5.

- [ ] **Step 4: Write the Supabase client**

Create `src/lib/supabase.js`:
```js
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

- [ ] **Step 5: Write `vite.config.js`**

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'The Collector',
        short_name: 'The Collector',
        description: 'Personal trading card collection tracker',
        theme_color: '#0d1b2a',
        background_color: '#0d1b2a',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      }
    })
  ]
})
```

- [ ] **Step 6: Verify dev server starts**

```bash
npm run dev
```

Expected: Vite dev server at http://localhost:5173 with default React page.

- [ ] **Step 7: Write `vercel.json` for SPA routing**

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/" }]
}
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: scaffold Vite+React project, Supabase client, PWA config"
```

---

## Task 3: Auth gate

**Files:**
- Create: `src/hooks/useAuth.js`
- Create: `src/components/auth/LoginScreen.jsx`
- Modify: `src/App.jsx`

**Interfaces:**
- Produces: `useAuth()` → `{ session, signIn(email, password), signOut, loading }`; App renders LoginScreen when no session, router when session exists

- [ ] **Step 1: Write `src/hooks/useAuth.js`**

```js
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useAuth() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return { session, signIn, signOut, loading }
}
```

- [ ] **Step 2: Write `src/components/auth/LoginScreen.jsx`**

```jsx
import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'

export function LoginScreen() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await signIn(email, password)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-screen">
      <h1 className="login-title">The Collector</h1>
      <form onSubmit={handleSubmit} className="login-form">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          className="input"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          className="input"
        />
        {error && <p className="login-error">{error}</p>}
        <button type="submit" className="btn btn--primary" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 3: Wire auth gate into `src/App.jsx`**

```jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { LoginScreen } from './components/auth/LoginScreen'
import { Shell } from './components/layout/Shell'
import { CollectionPage } from './pages/CollectionPage'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { CalendarPage } from './pages/CalendarPage'
import './styles/tokens.css'
import './styles/global.css'

export default function App() {
  const { session, loading } = useAuth()

  if (loading) return <div className="loading-screen" />

  if (!session) return <LoginScreen />

  return (
    <BrowserRouter>
      <Shell>
        <Routes>
          <Route path="/" element={<Navigate to="/collection" replace />} />
          <Route path="/collection" element={<CollectionPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
        </Routes>
      </Shell>
    </BrowserRouter>
  )
}
```

- [ ] **Step 4: Create stub pages so the app compiles**

Create `src/pages/CollectionPage.jsx`, `src/pages/AnalyticsPage.jsx`, `src/pages/CalendarPage.jsx` — each just:
```jsx
export function CollectionPage() { return <div>Collection</div> }
// (etc.)
```

- [ ] **Step 5: Verify login works**

```bash
npm run dev
```

Open http://localhost:5173. Should show login form. Sign in with the Supabase user created in Task 1. Should land on the stub collection page.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useAuth.js src/components/auth/LoginScreen.jsx src/App.jsx src/pages/
git commit -m "feat: Supabase auth gate — session-persisted email/password login"
```

---

## Task 4: Design system

**Files:**
- Create: `src/styles/tokens.css`
- Create: `src/styles/global.css`
- Modify: `index.html` (add Google Fonts link)

**Interfaces:**
- Produces: all CSS custom properties usable in any component; base element styles; fonts loaded

- [ ] **Step 1: Add Google Fonts to `index.html`**

```html
<!-- inside <head>, before existing tags -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400&family=IBM+Plex+Mono:wght@400;500&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
```

Also update `<title>` to `The Collector` and add:
```html
<meta name="theme-color" content="#0d1b2a">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="The Collector">
<link rel="apple-touch-icon" href="/icons/icon-192.png">
```

- [ ] **Step 2: Write `src/styles/tokens.css`**

```css
:root {
  /* Backgrounds */
  --bg-base:     #0d1b2a;
  --bg-surface:  #132338;
  --bg-elevated: #1a2f47;

  /* Borders */
  --border:        #1e3a52;
  --border-subtle: #162d43;

  /* Accent — brass gold */
  --gold:     #c9a84c;
  --gold-dim: #8a6d2f;

  /* Semantic status colours */
  --gain:      #4ecdc4;
  --gain-dim:  #2a8a84;
  --loss:      #e07a5f;
  --loss-dim:  #9e4a35;
  --neutral:   #8fa8c0;

  /* Text */
  --text-1: #f0ebe3;
  --text-2: #8fa8c0;
  --text-3: #4d6a82;

  /* Typography */
  --font-display: 'Fraunces', Georgia, serif;
  --font-body:    'Inter', system-ui, sans-serif;
  --font-mono:    'IBM Plex Mono', 'Courier New', monospace;

  /* Type scale */
  --text-xs:   11px;
  --text-sm:   13px;
  --text-base: 15px;
  --text-lg:   18px;
  --text-xl:   22px;
  --text-2xl:  28px;
  --text-3xl:  36px;

  /* Spacing (4px base) */
  --space-1:  4px;
  --space-2:  8px;
  --space-3:  12px;
  --space-4:  16px;
  --space-5:  24px;
  --space-6:  32px;
  --space-7:  48px;
  --space-8:  64px;

  /* Radii */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;

  /* Shadows */
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.4);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.5);

  /* Nav height (reserved for layout calculations) */
  --nav-height: 56px;
}
```

- [ ] **Step 3: Write `src/styles/global.css`**

```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html { font-size: 16px; -webkit-text-size-adjust: 100%; }

body {
  font-family: var(--font-body);
  font-size: var(--text-base);
  color: var(--text-1);
  background: var(--bg-base);
  min-height: 100dvh;
  -webkit-font-smoothing: antialiased;
}

a { color: var(--gold); text-decoration: none; }
a:hover { text-decoration: underline; }

button { cursor: pointer; font-family: inherit; }

input, select, textarea {
  font-family: inherit;
  font-size: var(--text-base);
  color: var(--text-1);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--space-2) var(--space-3);
  width: 100%;
  outline: none;
  transition: border-color 0.15s;
}
input:focus, select:focus, textarea:focus { border-color: var(--gold); }

/* Utility classes */
.loading-screen {
  display: flex; align-items: center; justify-content: center;
  height: 100dvh; background: var(--bg-base);
}

/* Login */
.login-screen {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; min-height: 100dvh; gap: var(--space-6);
  padding: var(--space-5);
}
.login-title {
  font-family: var(--font-display);
  font-size: var(--text-3xl);
  font-weight: 300;
  color: var(--gold);
  letter-spacing: 0.04em;
}
.login-form {
  display: flex; flex-direction: column; gap: var(--space-3);
  width: 100%; max-width: 320px;
}
.login-error { color: var(--loss); font-size: var(--text-sm); }

/* Buttons */
.btn {
  display: inline-flex; align-items: center; justify-content: center;
  gap: var(--space-2); padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-md); border: 1px solid transparent;
  font-size: var(--text-sm); font-weight: 500;
  transition: opacity 0.15s, background 0.15s;
}
.btn:disabled { opacity: 0.5; pointer-events: none; }
.btn--primary {
  background: var(--gold); color: var(--bg-base); border-color: var(--gold);
}
.btn--primary:hover { opacity: 0.85; }
.btn--ghost {
  background: transparent; color: var(--text-2); border-color: var(--border);
}
.btn--ghost:hover { background: var(--bg-elevated); color: var(--text-1); }
.btn--danger {
  background: transparent; color: var(--loss); border-color: var(--loss-dim);
}
.btn--danger:hover { background: var(--loss-dim); color: var(--text-1); }

/* Input (extra specificity for overrides) */
.input { /* inherits from global input selector above */ }

/* Modal */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.7);
  display: flex; align-items: flex-end; justify-content: center;
  z-index: 100; padding: 0;
}
@media (min-width: 768px) {
  .modal-overlay { align-items: center; padding: var(--space-5); }
}
.modal {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  width: 100%; max-width: 560px;
  max-height: 90dvh; overflow-y: auto;
  padding: var(--space-5);
}
@media (min-width: 768px) {
  .modal { border-radius: var(--radius-lg); }
}
.modal-title {
  font-family: var(--font-display);
  font-size: var(--text-xl);
  font-weight: 300;
  color: var(--text-1);
  margin-bottom: var(--space-4);
}

/* Badge */
.badge {
  display: inline-flex; align-items: center;
  padding: 2px var(--space-2); border-radius: var(--radius-sm);
  font-size: var(--text-xs); font-weight: 500;
  letter-spacing: 0.04em; text-transform: uppercase;
}
.badge--owned   { background: rgba(78,205,196,0.15); color: var(--gain); }
.badge--watchlist { background: rgba(201,168,76,0.15); color: var(--gold); }
.badge--sold    { background: rgba(143,168,192,0.15); color: var(--text-2); }

/* Empty state */
.empty-state {
  display: flex; flex-direction: column; align-items: center;
  gap: var(--space-3); padding: var(--space-8) var(--space-5);
  color: var(--text-3); text-align: center;
}
.empty-state__title { font-size: var(--text-lg); color: var(--text-2); }

/* Mono numbers */
.mono { font-family: var(--font-mono); font-variant-numeric: tabular-nums; }
.gain-text { color: var(--gain); }
.loss-text { color: var(--loss); }
```

- [ ] **Step 4: Verify fonts and tokens load**

```bash
npm run dev
```

Open http://localhost:5173, sign in. Background should be ink navy `#0d1b2a`. Open DevTools → Elements → inspect `body` → confirm `--bg-base` token is set.

- [ ] **Step 5: Commit**

```bash
git add src/styles/ index.html
git commit -m "feat: design system — navy/gold tokens, global styles, typography"
```

---

## Task 5: Shell layout + navigation

**Files:**
- Create: `src/components/layout/Shell.jsx`
- Create: `src/components/layout/Nav.jsx`

**Interfaces:**
- Produces: `<Shell>` wrapper that renders children in the page area and shows `<Nav>` at the bottom (mobile) / top (desktop); active route highlighted; sign-out accessible

- [ ] **Step 1: Write `src/components/layout/Nav.jsx`**

```jsx
import { NavLink } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

const links = [
  { to: '/collection', label: 'Collection' },
  { to: '/analytics',  label: 'Analytics' },
  { to: '/calendar',   label: 'Calendar' },
]

export function Nav() {
  const { signOut } = useAuth()
  return (
    <nav className="nav">
      {links.map(({ to, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) => `nav__link${isActive ? ' nav__link--active' : ''}`}
        >
          {label}
        </NavLink>
      ))}
      <button className="nav__signout btn btn--ghost" onClick={signOut}>
        Sign out
      </button>
    </nav>
  )
}
```

- [ ] **Step 2: Write `src/components/layout/Shell.jsx`**

```jsx
import { Nav } from './Nav'

export function Shell({ children }) {
  return (
    <div className="shell">
      <header className="shell__header">
        <span className="shell__brand">The Collector</span>
      </header>
      <main className="shell__main">{children}</main>
      <Nav />
    </div>
  )
}
```

- [ ] **Step 3: Add shell + nav styles to `global.css`**

Append to `src/styles/global.css`:
```css
/* Shell */
.shell {
  display: flex; flex-direction: column; min-height: 100dvh;
}
.shell__header {
  height: 48px; display: flex; align-items: center;
  padding: 0 var(--space-4);
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border);
  position: sticky; top: 0; z-index: 10;
}
.shell__brand {
  font-family: var(--font-display);
  font-size: var(--text-lg);
  font-weight: 300;
  color: var(--gold);
  letter-spacing: 0.04em;
}
.shell__main {
  flex: 1; overflow-y: auto;
  padding: var(--space-4);
  padding-bottom: calc(var(--nav-height) + var(--space-4));
}
@media (min-width: 768px) {
  .shell__main { padding-bottom: var(--space-4); max-width: 1024px; margin: 0 auto; width: 100%; }
}

/* Nav */
.nav {
  position: fixed; bottom: 0; left: 0; right: 0;
  height: var(--nav-height);
  display: flex; align-items: center;
  background: var(--bg-surface);
  border-top: 1px solid var(--border);
  padding: 0 var(--space-3);
  gap: var(--space-1);
  z-index: 10;
}
@media (min-width: 768px) {
  .nav { position: static; border-top: none; border-bottom: 1px solid var(--border); }
}
.nav__link {
  flex: 1; display: flex; align-items: center; justify-content: center;
  height: 100%; font-size: var(--text-sm); color: var(--text-3);
  text-decoration: none; transition: color 0.15s;
}
.nav__link:hover { color: var(--text-2); text-decoration: none; }
.nav__link--active { color: var(--gold); }
.nav__signout {
  font-size: var(--text-xs); padding: var(--space-1) var(--space-2);
}
```

- [ ] **Step 4: Verify layout renders correctly**

```bash
npm run dev
```

Sign in — should see "The Collector" in the header, three nav links at the bottom, stub page content in the middle. Tap each nav link to confirm routing works.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/
git commit -m "feat: shell layout and bottom nav with active-route highlighting"
```

---

## Task 6: Service layer — items + price history

**Files:**
- Create: `src/services/items.js`
- Create: `src/services/priceHistory.js`
- Create: `src/hooks/useItems.js`
- Create: `src/hooks/usePriceHistory.js`

**Interfaces:**
- Produces:
  - `getItems(filters)` → `Item[]`
  - `createItem(data)` → `Item`
  - `updateItem(id, data)` → `Item`
  - `deleteItem(id)` → `void`
  - `logPrice(itemId, price, note)` → `void` (paired write: inserts price_history + updates items.current_value)
  - `getPriceHistory(itemId)` → `PriceHistoryEntry[]`
  - `useItems(filters)` → `{ items, loading, error, refetch, createItem, updateItem, deleteItem }`
  - `usePriceHistory(itemId)` → `{ history, loading, logPrice }`

- [ ] **Step 1: Write `src/services/items.js`**

```js
import { supabase } from '../lib/supabase'

export async function getItems({ status, category, minValue, maxValue, sortBy } = {}) {
  let query = supabase.from('items').select('*')

  if (status)    query = query.eq('status', status)
  if (category)  query = query.eq('category', category)
  if (minValue != null) query = query.gte('current_value', minValue)
  if (maxValue != null) query = query.lte('current_value', maxValue)

  const sortMap = {
    value_desc:   { column: 'current_value', ascending: false },
    value_asc:    { column: 'current_value', ascending: true },
    gain_desc:    { column: 'current_value', ascending: false }, // computed client-side
    date_desc:    { column: 'created_at',    ascending: false },
  }
  const sort = sortMap[sortBy] ?? sortMap.date_desc
  query = query.order(sort.column, { ascending: sort.ascending })

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function createItem(data) {
  const { data: item, error } = await supabase
    .from('items')
    .insert(data)
    .select()
    .single()
  if (error) throw error
  return item
}

export async function updateItem(id, data) {
  const { data: item, error } = await supabase
    .from('items')
    .update(data)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return item
}

export async function deleteItem(id) {
  const { error } = await supabase.from('items').delete().eq('id', id)
  if (error) throw error
}
```

- [ ] **Step 2: Write `src/services/priceHistory.js`**

```js
import { supabase } from '../lib/supabase'

export async function getPriceHistory(itemId) {
  const { data, error } = await supabase
    .from('price_history')
    .select('*')
    .eq('item_id', itemId)
    .order('recorded_at', { ascending: true })
  if (error) throw error
  return data
}

// Paired write: always call this instead of updating items.current_value directly.
export async function logPrice(itemId, price, note = null) {
  const { error: historyError } = await supabase
    .from('price_history')
    .insert({ item_id: itemId, price, note })
  if (historyError) throw historyError

  const { error: itemError } = await supabase
    .from('items')
    .update({ current_value: price })
    .eq('id', itemId)
  if (itemError) throw itemError
}

export async function getAllPriceHistory() {
  const { data, error } = await supabase
    .from('price_history')
    .select('*, items(name, category, status)')
    .order('recorded_at', { ascending: true })
  if (error) throw error
  return data
}
```

- [ ] **Step 3: Write `src/hooks/useItems.js`**

```js
import { useCallback, useEffect, useState } from 'react'
import { createItem, deleteItem, getItems, updateItem } from '../services/items'

export function useItems(filters = {}) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const filtersKey = JSON.stringify(filters)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getItems(filters)
      setItems(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey])

  useEffect(() => { fetch() }, [fetch])

  async function create(data) {
    const item = await createItem(data)
    setItems(prev => [item, ...prev])
    return item
  }

  async function update(id, data) {
    const item = await updateItem(id, data)
    setItems(prev => prev.map(i => i.id === id ? item : i))
    return item
  }

  async function remove(id) {
    await deleteItem(id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  return { items, loading, error, refetch: fetch, createItem: create, updateItem: update, deleteItem: remove }
}
```

- [ ] **Step 4: Write `src/hooks/usePriceHistory.js`**

```js
import { useCallback, useEffect, useState } from 'react'
import { getPriceHistory, logPrice as logPriceSvc } from '../services/priceHistory'

export function usePriceHistory(itemId) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!itemId) return
    setLoading(true)
    try {
      const data = await getPriceHistory(itemId)
      setHistory(data)
    } finally {
      setLoading(false)
    }
  }, [itemId])

  useEffect(() => { fetch() }, [fetch])

  async function logPrice(price, note) {
    await logPriceSvc(itemId, price, note)
    await fetch()
  }

  return { history, loading, logPrice, refetch: fetch }
}
```

- [ ] **Step 5: Smoke-test the service layer in the browser console**

```bash
npm run dev
```

Sign in, then in the browser console:
```js
import('/src/lib/supabase.js').then(m => m.supabase.from('items').select('*').then(r => console.log(r.data)))
```
Expected: array of 5 seed items.

- [ ] **Step 6: Commit**

```bash
git add src/services/ src/hooks/useItems.js src/hooks/usePriceHistory.js
git commit -m "feat: service layer and hooks for items and price history"
```

---

## Task 7: Collection view — list, filters, item card

**Files:**
- Create: `src/components/collection/ItemCard.jsx`
- Create: `src/components/collection/ItemFilters.jsx`
- Create: `src/components/collection/ItemList.jsx`
- Create: `src/components/ui/Badge.jsx`
- Create: `src/components/ui/EmptyState.jsx`
- Modify: `src/pages/CollectionPage.jsx`

**Interfaces:**
- Consumes: `useItems(filters)` from Task 6
- Produces: filterable/sortable card list; clicking a card sets `selectedId` for detail view (Task 9)

- [ ] **Step 1: Write `src/components/ui/Badge.jsx`**

```jsx
const CATEGORY_LABELS = {
  pokemon:   'Pokémon',
  yugioh:    'Yu-Gi-Oh!',
  dragonball:'Dragon Ball Z',
  riftbound: 'Riftbound',
  other:     'Other',
}

export function StatusBadge({ status }) {
  return <span className={`badge badge--${status}`}>{status}</span>
}

export function CategoryBadge({ category }) {
  return <span className="badge badge--category">{CATEGORY_LABELS[category] ?? category}</span>
}
```

Add to `global.css`:
```css
.badge--category { background: rgba(143,168,192,0.1); color: var(--text-2); }
```

- [ ] **Step 2: Write `src/components/ui/EmptyState.jsx`**

```jsx
export function EmptyState({ title, body }) {
  return (
    <div className="empty-state">
      <p className="empty-state__title">{title}</p>
      {body && <p>{body}</p>}
    </div>
  )
}
```

- [ ] **Step 3: Write `src/components/collection/ItemCard.jsx`**

```jsx
import { CategoryBadge, StatusBadge } from '../ui/Badge'

function fmt(n) {
  if (n == null) return '—'
  return '£' + Number(n).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function gainPct(item) {
  if (item.purchase_price == null || item.current_value == null) return null
  return ((item.current_value - item.purchase_price) / item.purchase_price) * 100
}

export function ItemCard({ item, onClick }) {
  const pct = gainPct(item)
  const pctClass = pct == null ? '' : pct >= 0 ? 'gain-text' : 'loss-text'
  const gradeLabel = item.is_raw ? 'Raw' : item.grade_company && item.grade
    ? `${item.grade_company} ${item.grade}`
    : '—'

  return (
    <div className="item-card" onClick={() => onClick(item)}>
      {item.image_url && (
        <div className="item-card__img-wrap">
          <img src={item.image_url} alt={item.name} className="item-card__img" loading="lazy" />
        </div>
      )}
      <div className="item-card__body">
        <div className="item-card__meta">
          <StatusBadge status={item.status} />
          <CategoryBadge category={item.category} />
          <span className="item-card__grade mono">{gradeLabel}</span>
        </div>
        <p className="item-card__name">{item.name}</p>
        <div className="item-card__values">
          <span className="item-card__value mono">{fmt(item.current_value)}</span>
          {pct != null && (
            <span className={`item-card__pct mono ${pctClass}`}>
              {pct >= 0 ? '+' : ''}{pct.toFixed(1)}%
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
```

Add to `global.css`:
```css
.item-card {
  background: var(--bg-surface); border: 1px solid var(--border);
  border-radius: var(--radius-lg); overflow: hidden;
  cursor: pointer; transition: border-color 0.15s, transform 0.1s;
  display: flex; gap: var(--space-3); padding: var(--space-3);
}
.item-card:hover { border-color: var(--gold-dim); transform: translateY(-1px); }
.item-card__img-wrap { flex-shrink: 0; width: 64px; height: 88px; border-radius: var(--radius-sm); overflow: hidden; background: var(--bg-elevated); }
.item-card__img { width: 100%; height: 100%; object-fit: cover; }
.item-card__body { flex: 1; display: flex; flex-direction: column; gap: var(--space-2); }
.item-card__meta { display: flex; flex-wrap: wrap; gap: var(--space-1); align-items: center; }
.item-card__grade { font-size: var(--text-xs); color: var(--text-3); }
.item-card__name { font-size: var(--text-sm); color: var(--text-1); line-height: 1.3; }
.item-card__values { display: flex; align-items: baseline; gap: var(--space-2); margin-top: auto; }
.item-card__value { font-size: var(--text-lg); color: var(--text-1); }
.item-card__pct { font-size: var(--text-sm); }
```

- [ ] **Step 4: Write `src/components/collection/ItemFilters.jsx`**

```jsx
const STATUSES   = ['', 'owned', 'watchlist', 'sold']
const CATEGORIES = ['', 'pokemon', 'yugioh', 'dragonball', 'riftbound', 'other']
const SORTS      = [
  { value: 'date_desc',  label: 'Newest first' },
  { value: 'value_desc', label: 'Highest value' },
  { value: 'value_asc',  label: 'Lowest value' },
]
const CAT_LABELS = { pokemon:'Pokémon', yugioh:'Yu-Gi-Oh!', dragonball:'Dragon Ball Z', riftbound:'Riftbound', other:'Other' }

export function ItemFilters({ filters, onChange }) {
  function set(key, value) { onChange({ ...filters, [key]: value || undefined }) }

  return (
    <div className="item-filters">
      <select className="item-filters__select" value={filters.status ?? ''} onChange={e => set('status', e.target.value)}>
        <option value="">All statuses</option>
        {STATUSES.filter(Boolean).map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
      </select>
      <select className="item-filters__select" value={filters.category ?? ''} onChange={e => set('category', e.target.value)}>
        <option value="">All categories</option>
        {CATEGORIES.filter(Boolean).map(c => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
      </select>
      <select className="item-filters__select" value={filters.sortBy ?? 'date_desc'} onChange={e => set('sortBy', e.target.value)}>
        {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
      </select>
    </div>
  )
}
```

Add to `global.css`:
```css
.item-filters { display: flex; gap: var(--space-2); flex-wrap: wrap; margin-bottom: var(--space-4); }
.item-filters__select { width: auto; flex: 1; min-width: 120px; font-size: var(--text-sm); }
```

- [ ] **Step 5: Write `src/components/collection/ItemList.jsx`**

```jsx
import { ItemCard } from './ItemCard'
import { EmptyState } from '../ui/EmptyState'

export function ItemList({ items, loading, onSelect }) {
  if (loading) return <div className="item-list-loading">Loading…</div>
  if (!items.length) return (
    <EmptyState
      title="No items yet"
      body="Add your first card or product to get started."
    />
  )
  return (
    <div className="item-list">
      {items.map(item => (
        <ItemCard key={item.id} item={item} onClick={onSelect} />
      ))}
    </div>
  )
}
```

Add to `global.css`:
```css
.item-list { display: flex; flex-direction: column; gap: var(--space-3); }
.item-list-loading { color: var(--text-3); padding: var(--space-5); text-align: center; }
```

- [ ] **Step 6: Wire up `CollectionPage.jsx`**

```jsx
import { useState } from 'react'
import { ItemFilters } from '../components/collection/ItemFilters'
import { ItemList } from '../components/collection/ItemList'
import { useItems } from '../hooks/useItems'

export function CollectionPage() {
  const [filters, setFilters] = useState({})
  const [selectedId, setSelectedId] = useState(null)
  const { items, loading, error } = useItems(filters)

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Collection</h2>
        <button className="btn btn--primary">+ Add</button>
      </div>
      {error && <p className="error-text">{error}</p>}
      <ItemFilters filters={filters} onChange={setFilters} />
      <ItemList items={items} loading={loading} onSelect={item => setSelectedId(item.id)} />
      {selectedId && <p style={{color:'var(--text-3)'}}>Selected: {selectedId} — detail view coming in Task 9</p>}
    </div>
  )
}
```

Add to `global.css`:
```css
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-4); }
.page-title { font-family: var(--font-display); font-size: var(--text-2xl); font-weight: 300; color: var(--text-1); }
.error-text { color: var(--loss); font-size: var(--text-sm); margin-bottom: var(--space-3); }
```

- [ ] **Step 7: Verify collection renders**

```bash
npm run dev
```

Sign in → Collection tab. Should see 5 seed items as cards with badges, grades, values. Try filter dropdowns — list should refilter. No console errors.

- [ ] **Step 8: Commit**

```bash
git add src/components/collection/ src/components/ui/ src/pages/CollectionPage.jsx
git commit -m "feat: collection list view with filters, sort, and item cards"
```

---

## Task 8: Item form (add / edit / delete)

**Files:**
- Create: `src/components/collection/ItemForm.jsx`
- Create: `src/components/ui/Modal.jsx`
- Modify: `src/pages/CollectionPage.jsx`

**Interfaces:**
- Consumes: `useItems()` from Task 6 (`createItem`, `updateItem`, `deleteItem`)
- Produces: modal form with all item fields; handles create and edit modes; confirm-delete flow

- [ ] **Step 1: Write `src/components/ui/Modal.jsx`**

```jsx
import { useEffect } from 'react'

export function Modal({ title, onClose, children }) {
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true">
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button className="btn btn--ghost modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}
```

Add to `global.css`:
```css
.modal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-4); }
.modal-close { padding: var(--space-1) var(--space-2); }
.form-grid { display: flex; flex-direction: column; gap: var(--space-3); }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); }
.form-label { display: flex; flex-direction: column; gap: var(--space-1); font-size: var(--text-sm); color: var(--text-2); }
.form-actions { display: flex; gap: var(--space-2); justify-content: flex-end; margin-top: var(--space-4); padding-top: var(--space-4); border-top: 1px solid var(--border); }
```

- [ ] **Step 2: Write `src/components/collection/ItemForm.jsx`**

```jsx
import { useState } from 'react'
import { Modal } from '../ui/Modal'

const CATEGORIES = ['pokemon','yugioh','dragonball','riftbound','other']
const CAT_LABELS = { pokemon:'Pokémon', yugioh:'Yu-Gi-Oh!', dragonball:'Dragon Ball Z', riftbound:'Riftbound', other:'Other' }
const STATUSES   = ['owned','watchlist','sold']

const empty = {
  name:'', category:'pokemon', status:'watchlist', is_raw:false,
  grade_company:'PSA', grade:'', purchase_price:'', purchase_date:'',
  current_value:'', quantity:1, seller_source:'', cert_number:'',
  image_url:'', sale_price:'', sale_date:'', notes:''
}

function toForm(item) {
  if (!item) return empty
  return {
    name: item.name ?? '',
    category: item.category ?? 'pokemon',
    status: item.status ?? 'watchlist',
    is_raw: item.is_raw ?? false,
    grade_company: item.grade_company ?? 'PSA',
    grade: item.grade ?? '',
    purchase_price: item.purchase_price ?? '',
    purchase_date: item.purchase_date ?? '',
    current_value: item.current_value ?? '',
    quantity: item.quantity ?? 1,
    seller_source: item.seller_source ?? '',
    cert_number: item.cert_number ?? '',
    image_url: item.image_url ?? '',
    sale_price: item.sale_price ?? '',
    sale_date: item.sale_date ?? '',
    notes: item.notes ?? '',
  }
}

function toPayload(form) {
  return {
    name: form.name.trim(),
    category: form.category,
    status: form.status,
    is_raw: form.is_raw,
    grade_company: form.is_raw ? null : (form.grade_company || null),
    grade: form.is_raw ? null : (form.grade || null),
    purchase_price: form.purchase_price !== '' ? Number(form.purchase_price) : null,
    purchase_date: form.purchase_date || null,
    current_value: form.current_value !== '' ? Number(form.current_value) : null,
    quantity: Number(form.quantity) || 1,
    seller_source: form.seller_source || null,
    cert_number: form.cert_number || null,
    image_url: form.image_url || null,
    sale_price: form.status === 'sold' && form.sale_price !== '' ? Number(form.sale_price) : null,
    sale_date: form.status === 'sold' ? (form.sale_date || null) : null,
    notes: form.notes || null,
  }
}

export function ItemForm({ item, onSave, onDelete, onClose }) {
  const [form, setForm] = useState(toForm(item))
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  function set(key, val) { setForm(prev => ({ ...prev, [key]: val })) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    try {
      await onSave(toPayload(form))
      onClose()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    await onDelete(item.id)
    onClose()
  }

  return (
    <Modal title={item ? 'Edit item' : 'Add item'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="form-grid">
        <label className="form-label">
          Name *
          <input className="input" value={form.name} onChange={e => set('name', e.target.value)} required />
        </label>
        <div className="form-row">
          <label className="form-label">
            Category
            <select className="input" value={form.category} onChange={e => set('category', e.target.value)}>
              {CATEGORIES.map(c => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
            </select>
          </label>
          <label className="form-label">
            Status
            <select className="input" value={form.status} onChange={e => set('status', e.target.value)}>
              {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
            </select>
          </label>
        </div>
        <label className="form-label form-label--row">
          <input type="checkbox" checked={form.is_raw} onChange={e => set('is_raw', e.target.checked)} />
          Raw / ungraded (no grading company or grade)
        </label>
        {!form.is_raw && (
          <div className="form-row">
            <label className="form-label">
              Grading company
              <input className="input" value={form.grade_company} onChange={e => set('grade_company', e.target.value)} placeholder="PSA" />
            </label>
            <label className="form-label">
              Grade
              <input className="input" value={form.grade} onChange={e => set('grade', e.target.value)} placeholder="9" />
            </label>
          </div>
        )}
        <div className="form-row">
          <label className="form-label">
            Purchase price (£)
            <input className="input" type="number" step="0.01" min="0" value={form.purchase_price} onChange={e => set('purchase_price', e.target.value)} />
          </label>
          <label className="form-label">
            Purchase date
            <input className="input" type="date" value={form.purchase_date} onChange={e => set('purchase_date', e.target.value)} />
          </label>
        </div>
        <div className="form-row">
          <label className="form-label">
            Current value (£)
            <input className="input" type="number" step="0.01" min="0" value={form.current_value} onChange={e => set('current_value', e.target.value)} />
          </label>
          <label className="form-label">
            Quantity
            <input className="input" type="number" min="1" value={form.quantity} onChange={e => set('quantity', e.target.value)} />
          </label>
        </div>
        <div className="form-row">
          <label className="form-label">
            Seller / source
            <input className="input" value={form.seller_source} onChange={e => set('seller_source', e.target.value)} />
          </label>
          <label className="form-label">
            Cert number
            <input className="input" value={form.cert_number} onChange={e => set('cert_number', e.target.value)} placeholder="PSA cert #" />
          </label>
        </div>
        <label className="form-label">
          Image URL
          <input className="input" type="url" value={form.image_url} onChange={e => set('image_url', e.target.value)} placeholder="https://…" />
        </label>
        {form.status === 'sold' && (
          <div className="form-row">
            <label className="form-label">
              Sale price (£)
              <input className="input" type="number" step="0.01" min="0" value={form.sale_price} onChange={e => set('sale_price', e.target.value)} />
            </label>
            <label className="form-label">
              Sale date
              <input className="input" type="date" value={form.sale_date} onChange={e => set('sale_date', e.target.value)} />
            </label>
          </div>
        )}
        <label className="form-label">
          Notes
          <textarea className="input" rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} />
        </label>
        <div className="form-actions">
          {item && !confirmDelete && (
            <button type="button" className="btn btn--danger" onClick={() => setConfirmDelete(true)}>Delete</button>
          )}
          {confirmDelete && (
            <button type="button" className="btn btn--danger" onClick={handleDelete}>Confirm delete</button>
          )}
          <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? 'Saving…' : (item ? 'Save changes' : 'Add item')}
          </button>
        </div>
      </form>
    </Modal>
  )
}
```

Add to `global.css`:
```css
.form-label--row { flex-direction: row; align-items: center; gap: var(--space-2); }
.form-label--row input[type=checkbox] { width: auto; }
```

- [ ] **Step 3: Wire ItemForm into CollectionPage**

Update `src/pages/CollectionPage.jsx` — replace stub with:
```jsx
import { useState } from 'react'
import { ItemFilters } from '../components/collection/ItemFilters'
import { ItemList } from '../components/collection/ItemList'
import { ItemForm } from '../components/collection/ItemForm'
import { useItems } from '../hooks/useItems'

export function CollectionPage() {
  const [filters, setFilters] = useState({})
  const [selectedId, setSelectedId] = useState(null)
  const [formItem, setFormItem] = useState(null)   // null = closed, {} = add, item = edit
  const { items, loading, error, createItem, updateItem, deleteItem } = useItems(filters)

  function openAdd() { setFormItem({}) }
  function openEdit(item) { setFormItem(item) }
  function closeForm() { setFormItem(null) }

  async function handleSave(data) {
    if (formItem?.id) {
      await updateItem(formItem.id, data)
    } else {
      await createItem(data)
    }
  }

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Collection</h2>
        <button className="btn btn--primary" onClick={openAdd}>+ Add</button>
      </div>
      {error && <p className="error-text">{error}</p>}
      <ItemFilters filters={filters} onChange={setFilters} />
      <ItemList
        items={items}
        loading={loading}
        onSelect={item => { setSelectedId(item.id); openEdit(item) }}
      />
      {formItem !== null && (
        <ItemForm
          item={formItem?.id ? formItem : null}
          onSave={handleSave}
          onDelete={deleteItem}
          onClose={closeForm}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 4: Verify add/edit/delete**

```bash
npm run dev
```

- Click "+ Add" → modal opens with all fields
- Fill in a test item → "Add item" → card appears in list
- Click a card → modal opens in edit mode with pre-filled values
- Edit a field → "Save changes" → list updates
- Click "Delete" → confirm → card disappears
- No console errors throughout

- [ ] **Step 5: Commit**

```bash
git add src/components/collection/ItemForm.jsx src/components/ui/Modal.jsx src/pages/CollectionPage.jsx
git commit -m "feat: add/edit/delete item form with all schema fields"
```

---

## Task 9: Item detail view + price history chart

**Files:**
- Create: `src/components/collection/ItemDetail.jsx`
- Create: `src/components/collection/LogPriceForm.jsx`
- Modify: `src/pages/CollectionPage.jsx`

**Interfaces:**
- Consumes: `usePriceHistory(itemId)` from Task 6; `useItems()` `updateItem`
- Produces: slide-in or modal detail view showing full price history line chart (Recharts), gain/loss, notes, and a "Log price" button that opens `LogPriceForm`

- [ ] **Step 1: Write `src/components/collection/LogPriceForm.jsx`**

```jsx
import { useState } from 'react'
import { Modal } from '../ui/Modal'

export function LogPriceForm({ item, onLog, onClose }) {
  const [price, setPrice] = useState(item.current_value ?? '')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!price) return
    setSaving(true)
    try {
      await onLog(Number(price), note || null)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="Log new price" onClose={onClose}>
      <form onSubmit={handleSubmit} className="form-grid">
        <label className="form-label">
          New value (£)
          <input className="input" type="number" step="0.01" min="0" value={price}
            onChange={e => setPrice(e.target.value)} required autoFocus />
        </label>
        <label className="form-label">
          Note (optional)
          <input className="input" value={note} onChange={e => setNote(e.target.value)}
            placeholder="e.g. negotiated from £1,050 to £980" />
        </label>
        <div className="form-actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? 'Saving…' : 'Log price'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
```

- [ ] **Step 2: Write `src/components/collection/ItemDetail.jsx`**

```jsx
import { format } from 'date-fns'
import { useState } from 'react'
import {
  CartesianGrid, Line, LineChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis
} from 'recharts'
import { usePriceHistory } from '../../hooks/usePriceHistory'
import { CategoryBadge, StatusBadge } from '../ui/Badge'
import { Modal } from '../ui/Modal'
import { LogPriceForm } from './LogPriceForm'

function fmt(n) {
  if (n == null) return '—'
  return '£' + Number(n).toLocaleString('en-GB', { minimumFractionDigits: 2 })
}

function gainInfo(item) {
  if (item.purchase_price == null || item.current_value == null)
    return { abs: null, pct: null }
  const abs = item.current_value - item.purchase_price
  const pct = (abs / item.purchase_price) * 100
  return { abs, pct }
}

export function ItemDetail({ item, onEdit, onClose }) {
  const { history, loading, logPrice } = usePriceHistory(item.id)
  const [showLogPrice, setShowLogPrice] = useState(false)
  const { abs, pct } = gainInfo(item)
  const gainClass = abs == null ? '' : abs >= 0 ? 'gain-text' : 'loss-text'

  const chartData = history.map(h => ({
    date: format(new Date(h.recorded_at), 'dd MMM yy'),
    price: Number(h.price),
    note: h.note,
  }))

  const gradeLabel = item.is_raw ? 'Raw / Ungraded'
    : item.grade_company && item.grade ? `${item.grade_company} ${item.grade}` : '—'

  return (
    <>
      <Modal title={item.name} onClose={onClose}>
        <div className="detail">
          <div className="detail__badges">
            <StatusBadge status={item.status} />
            <CategoryBadge category={item.category} />
            <span className="badge badge--category">{gradeLabel}</span>
          </div>

          <div className="detail__stats">
            <div className="detail__stat">
              <span className="detail__stat-label">Current value</span>
              <span className="detail__stat-value mono">{fmt(item.current_value)}</span>
            </div>
            <div className="detail__stat">
              <span className="detail__stat-label">Paid</span>
              <span className="detail__stat-value mono">{fmt(item.purchase_price)}</span>
            </div>
            {abs != null && (
              <div className="detail__stat">
                <span className="detail__stat-label">Gain / loss</span>
                <span className={`detail__stat-value mono ${gainClass}`}>
                  {abs >= 0 ? '+' : ''}{fmt(abs)} ({pct >= 0 ? '+' : ''}{pct.toFixed(1)}%)
                </span>
              </div>
            )}
          </div>

          {item.cert_number && (
            <p className="detail__cert mono">Cert: {item.cert_number}</p>
          )}

          <div className="detail__section-title">Price history</div>
          {loading ? (
            <p className="detail__loading">Loading…</p>
          ) : chartData.length < 2 ? (
            <p className="detail__no-chart">Add at least two price points to see the chart.</p>
          ) : (
            <div className="detail__chart">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fill: 'var(--text-3)', fontSize: 11 }} />
                  <YAxis
                    tick={{ fill: 'var(--text-3)', fontSize: 11 }}
                    tickFormatter={v => `£${v.toLocaleString('en-GB')}`}
                    width={64}
                  />
                  <Tooltip
                    contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-1)' }}
                    formatter={v => [`£${Number(v).toLocaleString('en-GB', {minimumFractionDigits:2})}`, 'Value']}
                  />
                  <Line type="monotone" dataKey="price" stroke="var(--gold)" strokeWidth={2} dot={{ fill: 'var(--gold)', r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {history.length > 0 && (
            <div className="detail__log">
              {[...history].reverse().map(h => (
                <div key={h.id} className="detail__log-entry">
                  <span className="detail__log-date mono">{format(new Date(h.recorded_at), 'dd MMM yyyy')}</span>
                  <span className="detail__log-price mono">{fmt(h.price)}</span>
                  {h.note && <span className="detail__log-note">{h.note}</span>}
                </div>
              ))}
            </div>
          )}

          {item.notes && (
            <>
              <div className="detail__section-title">Notes</div>
              <p className="detail__notes">{item.notes}</p>
            </>
          )}

          <div className="form-actions">
            <button className="btn btn--ghost" onClick={() => setShowLogPrice(true)}>Log price</button>
            <button className="btn btn--primary" onClick={() => { onClose(); onEdit(item) }}>Edit</button>
          </div>
        </div>
      </Modal>

      {showLogPrice && (
        <LogPriceForm
          item={item}
          onLog={logPrice}
          onClose={() => setShowLogPrice(false)}
        />
      )}
    </>
  )
}
```

Add to `global.css`:
```css
.detail { display: flex; flex-direction: column; gap: var(--space-4); }
.detail__badges { display: flex; flex-wrap: wrap; gap: var(--space-1); }
.detail__stats { display: flex; flex-wrap: wrap; gap: var(--space-4); }
.detail__stat { display: flex; flex-direction: column; gap: 2px; }
.detail__stat-label { font-size: var(--text-xs); color: var(--text-3); text-transform: uppercase; letter-spacing: 0.06em; }
.detail__stat-value { font-size: var(--text-xl); }
.detail__cert { font-size: var(--text-sm); color: var(--text-3); }
.detail__section-title { font-size: var(--text-xs); color: var(--text-3); text-transform: uppercase; letter-spacing: 0.06em; border-bottom: 1px solid var(--border); padding-bottom: var(--space-1); }
.detail__chart { background: var(--bg-elevated); border-radius: var(--radius-md); padding: var(--space-3); }
.detail__no-chart, .detail__loading { font-size: var(--text-sm); color: var(--text-3); }
.detail__log { display: flex; flex-direction: column; gap: var(--space-2); }
.detail__log-entry { display: flex; flex-wrap: wrap; gap: var(--space-2); font-size: var(--text-sm); align-items: baseline; }
.detail__log-date { color: var(--text-3); min-width: 90px; }
.detail__log-price { color: var(--text-1); }
.detail__log-note { color: var(--text-2); flex: 1; }
.detail__notes { font-size: var(--text-sm); color: var(--text-2); line-height: 1.6; white-space: pre-wrap; }
```

- [ ] **Step 3: Integrate ItemDetail into CollectionPage**

Import and use `ItemDetail` in `CollectionPage.jsx`. Replace the selected-id stub with:

```jsx
// Add to imports:
import { ItemDetail } from '../components/collection/ItemDetail'

// Replace the stub {selectedId && ...} with:
{selectedId && (
  <ItemDetail
    item={items.find(i => i.id === selectedId)}
    onEdit={item => { setSelectedId(null); setFormItem(item) }}
    onClose={() => setSelectedId(null)}
  />
)}

// Update onSelect in ItemList to only set selectedId (not open edit):
onSelect={item => setSelectedId(item.id)}
```

- [ ] **Step 4: Verify detail view and price logging**

```bash
npm run dev
```

- Click Vegito card → detail modal opens → price chart shows two data points (Aug 2025 £175, Jul 2026 £450)
- Click "Log price" → enter a new value + note → confirm → chart adds the new data point; list card updates current value
- Umbreon → chart shows 1 point → "Add at least two price points" message
- No console errors

- [ ] **Step 5: Commit**

```bash
git add src/components/collection/ItemDetail.jsx src/components/collection/LogPriceForm.jsx src/pages/CollectionPage.jsx
git commit -m "feat: item detail view with price history chart and log-price flow"
```

---

## Task 10: Portfolio analytics

**Files:**
- Create: `src/services/analytics.js`
- Create: `src/components/analytics/PortfolioSummary.jsx`
- Create: `src/components/analytics/CategoryBreakdown.jsx`
- Create: `src/components/analytics/PortfolioChart.jsx`
- Create: `src/components/analytics/GainersLosers.jsx`
- Modify: `src/pages/AnalyticsPage.jsx`

**Interfaces:**
- Consumes: `getItems()` and `getAllPriceHistory()` from services
- Produces: headline stat row, donut chart, aggregate portfolio-value-over-time chart, top-3 gainers/losers table

- [ ] **Step 1: Write `src/services/analytics.js`**

```js
import { getItems } from './items'
import { getAllPriceHistory } from './priceHistory'

export async function getAnalyticsData() {
  const [items, allHistory] = await Promise.all([
    getItems(),
    getAllPriceHistory(),
  ])

  const owned = items.filter(i => i.status !== 'sold')
  const totalValue    = owned.reduce((s, i) => s + (Number(i.current_value) || 0), 0)
  const totalInvested = owned.reduce((s, i) => s + (Number(i.purchase_price) || 0), 0)
  const totalGain     = totalValue - totalInvested

  // Realized gains from sold items
  const sold = items.filter(i => i.status === 'sold')
  const realizedGain = sold.reduce((s, i) => {
    const g = (Number(i.sale_price) || 0) - (Number(i.purchase_price) || 0)
    return s + g
  }, 0)

  // Category breakdown (owned + watchlist)
  const byCategory = {}
  owned.forEach(i => {
    byCategory[i.category] = (byCategory[i.category] || 0) + (Number(i.current_value) || 0)
  })

  // Gainers/losers (items with both purchase_price and current_value)
  const withGain = items
    .filter(i => i.purchase_price && i.current_value && i.status !== 'sold')
    .map(i => ({
      ...i,
      gainPct: ((i.current_value - i.purchase_price) / i.purchase_price) * 100
    }))
    .sort((a, b) => b.gainPct - a.gainPct)

  // Aggregate portfolio value over time from price_history
  // Group all history entries by date (day), sum values for that day
  // Strategy: for each date that has at least one price update, compute total
  // portfolio value = sum of latest known price for each item up to that date
  const portfolioTimeline = buildPortfolioTimeline(items, allHistory)

  return { totalValue, totalInvested, totalGain, realizedGain, byCategory, withGain, portfolioTimeline }
}

function buildPortfolioTimeline(items, history) {
  if (!history.length) return []

  // Get all unique dates (to the day) from history
  const dates = [...new Set(history.map(h => h.recorded_at.slice(0, 10)))].sort()

  return dates.map(date => {
    // For each item, find the latest price_history entry on or before this date
    let total = 0
    items.forEach(item => {
      const entries = history
        .filter(h => h.item_id === item.id && h.recorded_at.slice(0, 10) <= date)
        .sort((a, b) => a.recorded_at.localeCompare(b.recorded_at))
      if (entries.length) {
        total += Number(entries[entries.length - 1].price)
      } else if (item.current_value) {
        // Item existed but had no history before this date — use current value as fallback
        // (only if item was created before or on this date)
        if (item.created_at.slice(0, 10) <= date) {
          total += Number(item.current_value)
        }
      }
    })
    return { date, total }
  })
}
```

- [ ] **Step 2: Write `src/components/analytics/PortfolioSummary.jsx`**

```jsx
function fmt(n, showSign = false) {
  const abs = Math.abs(n)
  const str = '£' + abs.toLocaleString('en-GB', { minimumFractionDigits: 2 })
  if (showSign) return (n >= 0 ? '+' : '−') + str
  return str
}

export function PortfolioSummary({ data }) {
  const { totalValue, totalInvested, totalGain, realizedGain } = data
  const gainPct = totalInvested ? (totalGain / totalInvested) * 100 : 0
  const gainClass = totalGain >= 0 ? 'gain-text' : 'loss-text'

  return (
    <div className="summary-grid">
      <div className="summary-stat">
        <span className="summary-stat__label">Portfolio value</span>
        <span className="summary-stat__value mono">{fmt(totalValue)}</span>
      </div>
      <div className="summary-stat">
        <span className="summary-stat__label">Total invested</span>
        <span className="summary-stat__value mono">{fmt(totalInvested)}</span>
      </div>
      <div className="summary-stat">
        <span className="summary-stat__label">Unrealized gain</span>
        <span className={`summary-stat__value mono ${gainClass}`}>
          {fmt(totalGain, true)} ({gainPct >= 0 ? '+' : ''}{gainPct.toFixed(1)}%)
        </span>
      </div>
      <div className="summary-stat">
        <span className="summary-stat__label">Realized gain</span>
        <span className={`summary-stat__value mono ${realizedGain >= 0 ? 'gain-text' : 'loss-text'}`}>
          {fmt(realizedGain, true)}
        </span>
      </div>
    </div>
  )
}
```

Add to `global.css`:
```css
.summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); margin-bottom: var(--space-5); }
@media (min-width: 640px) { .summary-grid { grid-template-columns: repeat(4, 1fr); } }
.summary-stat { display: flex; flex-direction: column; gap: var(--space-1); background: var(--bg-surface); border: 1px solid var(--border); border-radius: var(--radius-md); padding: var(--space-3); }
.summary-stat__label { font-size: var(--text-xs); color: var(--text-3); text-transform: uppercase; letter-spacing: 0.06em; }
.summary-stat__value { font-size: var(--text-lg); }
```

- [ ] **Step 3: Write `src/components/analytics/CategoryBreakdown.jsx`**

```jsx
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

const COLORS = { pokemon:'#4ecdc4', yugioh:'#c9a84c', dragonball:'#e07a5f', riftbound:'#8fa8c0', other:'#4d6a82' }
const LABELS = { pokemon:'Pokémon', yugioh:'Yu-Gi-Oh!', dragonball:'Dragon Ball Z', riftbound:'Riftbound', other:'Other' }

export function CategoryBreakdown({ byCategory }) {
  const data = Object.entries(byCategory)
    .filter(([, v]) => v > 0)
    .map(([key, value]) => ({ name: LABELS[key] ?? key, value, color: COLORS[key] ?? '#4d6a82' }))

  if (!data.length) return null

  return (
    <div className="analytics-card">
      <h3 className="analytics-card__title">By category</h3>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={48}>
            {data.map(entry => <Cell key={entry.name} fill={entry.color} />)}
          </Pie>
          <Tooltip
            contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-1)' }}
            formatter={v => [`£${Number(v).toLocaleString('en-GB', {minimumFractionDigits:2})}`, '']}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-2)' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
```

- [ ] **Step 4: Write `src/components/analytics/PortfolioChart.jsx`**

```jsx
import { format, parseISO } from 'date-fns'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export function PortfolioChart({ timeline }) {
  if (timeline.length < 2) return (
    <div className="analytics-card">
      <h3 className="analytics-card__title">Portfolio value over time</h3>
      <p className="analytics-empty">Log price updates on your items to see this chart grow.</p>
    </div>
  )

  const data = timeline.map(t => ({
    date: format(parseISO(t.date), 'dd MMM yy'),
    total: t.total,
  }))

  return (
    <div className="analytics-card">
      <h3 className="analytics-card__title">Portfolio value over time</h3>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="date" tick={{ fill: 'var(--text-3)', fontSize: 11 }} />
          <YAxis
            tick={{ fill: 'var(--text-3)', fontSize: 11 }}
            tickFormatter={v => `£${(v/1000).toFixed(0)}k`}
            width={48}
          />
          <Tooltip
            contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-1)' }}
            formatter={v => [`£${Number(v).toLocaleString('en-GB', {minimumFractionDigits:2})}`, 'Portfolio']}
          />
          <Line type="monotone" dataKey="total" stroke="var(--gold)" strokeWidth={2} dot={{ fill: 'var(--gold)', r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
```

- [ ] **Step 5: Write `src/components/analytics/GainersLosers.jsx`**

```jsx
function fmt(n) {
  return '£' + Math.abs(n).toLocaleString('en-GB', { minimumFractionDigits: 2 })
}

export function GainersLosers({ withGain }) {
  if (!withGain.length) return null
  const gainers = withGain.slice(0, 3)
  const losers  = [...withGain].reverse().slice(0, 3).filter(i => i.gainPct < 0)

  return (
    <div className="analytics-card">
      <h3 className="analytics-card__title">Gainers &amp; losers</h3>
      {gainers.length > 0 && (
        <>
          <p className="gainers-section-label">Top gainers</p>
          {gainers.map(item => (
            <div key={item.id} className="gainer-row">
              <span className="gainer-row__name">{item.name}</span>
              <span className="gainer-row__pct mono gain-text">+{item.gainPct.toFixed(1)}%</span>
              <span className="gainer-row__abs mono gain-text">+{fmt(item.current_value - item.purchase_price)}</span>
            </div>
          ))}
        </>
      )}
      {losers.length > 0 && (
        <>
          <p className="gainers-section-label" style={{marginTop:'var(--space-3)'}}>Top losers</p>
          {losers.map(item => (
            <div key={item.id} className="gainer-row">
              <span className="gainer-row__name">{item.name}</span>
              <span className="gainer-row__pct mono loss-text">{item.gainPct.toFixed(1)}%</span>
              <span className="gainer-row__abs mono loss-text">−{fmt(item.purchase_price - item.current_value)}</span>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
```

Add to `global.css`:
```css
.analytics-card { background: var(--bg-surface); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: var(--space-4); margin-bottom: var(--space-4); }
.analytics-card__title { font-family: var(--font-display); font-size: var(--text-lg); font-weight: 300; color: var(--text-1); margin-bottom: var(--space-3); }
.analytics-empty { font-size: var(--text-sm); color: var(--text-3); }
.gainers-section-label { font-size: var(--text-xs); color: var(--text-3); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: var(--space-2); }
.gainer-row { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-2) 0; border-bottom: 1px solid var(--border-subtle); }
.gainer-row:last-child { border-bottom: none; }
.gainer-row__name { flex: 1; font-size: var(--text-sm); color: var(--text-1); }
.gainer-row__pct { min-width: 56px; text-align: right; font-size: var(--text-sm); }
.gainer-row__abs { min-width: 72px; text-align: right; font-size: var(--text-sm); }
```

- [ ] **Step 6: Wire up `AnalyticsPage.jsx`**

```jsx
import { useEffect, useState } from 'react'
import { getAnalyticsData } from '../services/analytics'
import { CategoryBreakdown } from '../components/analytics/CategoryBreakdown'
import { GainersLosers } from '../components/analytics/GainersLosers'
import { PortfolioChart } from '../components/analytics/PortfolioChart'
import { PortfolioSummary } from '../components/analytics/PortfolioSummary'

export function AnalyticsPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAnalyticsData().then(d => { setData(d); setLoading(false) })
  }, [])

  if (loading) return <p style={{ color: 'var(--text-3)', padding: 'var(--space-5)' }}>Loading…</p>
  if (!data) return null

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Analytics</h2>
      </div>
      <PortfolioSummary data={data} />
      <PortfolioChart timeline={data.portfolioTimeline} />
      <CategoryBreakdown byCategory={data.byCategory} />
      <GainersLosers withGain={data.withGain} />
    </div>
  )
}
```

- [ ] **Step 7: Verify analytics page**

```bash
npm run dev
```

Navigate to Analytics. Should see:
- Headline stats showing seed data totals
- Donut chart with Riftbound, Pokémon, etc.
- Portfolio timeline chart (Vegito has two historical points → should show a line)
- No gainers/losers yet (seed items have no purchase_price — go back to Collection, edit one item and set a purchase price to verify)

- [ ] **Step 8: Commit**

```bash
git add src/services/analytics.js src/components/analytics/ src/pages/AnalyticsPage.jsx
git commit -m "feat: portfolio analytics — summary stats, category donut, timeline chart, gainers/losers"
```

---

## Task 11: Release calendar

**Files:**
- Create: `src/services/releaseCalendar.js`
- Create: `src/hooks/useReleaseCalendar.js`
- Create: `src/components/calendar/CalendarList.jsx`
- Create: `src/components/calendar/ReleaseForm.jsx`
- Modify: `src/pages/CalendarPage.jsx`

**Interfaces:**
- Consumes: `release_calendar` Supabase table
- Produces: list ordered by release_date, status derived from date (past/next/upcoming), countdown for next release, add/edit/delete modal

- [ ] **Step 1: Write `src/services/releaseCalendar.js`**

```js
import { supabase } from '../lib/supabase'

export async function getReleases() {
  const { data, error } = await supabase
    .from('release_calendar')
    .select('*')
    .order('release_date', { ascending: true })
  if (error) throw error
  return data
}

export async function createRelease(data) {
  const { data: release, error } = await supabase
    .from('release_calendar').insert(data).select().single()
  if (error) throw error
  return release
}

export async function updateRelease(id, data) {
  const { data: release, error } = await supabase
    .from('release_calendar').update(data).eq('id', id).select().single()
  if (error) throw error
  return release
}

export async function deleteRelease(id) {
  const { error } = await supabase.from('release_calendar').delete().eq('id', id)
  if (error) throw error
}
```

- [ ] **Step 2: Write `src/hooks/useReleaseCalendar.js`**

```js
import { useCallback, useEffect, useState } from 'react'
import { createRelease, deleteRelease, getReleases, updateRelease } from '../services/releaseCalendar'

export function useReleaseCalendar() {
  const [releases, setReleases] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const data = await getReleases()
    setReleases(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  async function create(data) {
    const r = await createRelease(data)
    setReleases(prev => [...prev, r].sort((a,b) => a.release_date.localeCompare(b.release_date)))
  }
  async function update(id, data) {
    const r = await updateRelease(id, data)
    setReleases(prev => prev.map(x => x.id === id ? r : x))
  }
  async function remove(id) {
    await deleteRelease(id)
    setReleases(prev => prev.filter(x => x.id !== id))
  }

  return { releases, loading, create, update, remove }
}
```

- [ ] **Step 3: Write `src/components/calendar/CalendarList.jsx`**

```jsx
import { differenceInDays, format, parseISO } from 'date-fns'

function deriveStatus(dateStr, nextId) {
  const today = new Date(); today.setHours(0,0,0,0)
  const d = parseISO(dateStr)
  if (d < today) return 'past'
  if (nextId) return 'next'
  return 'upcoming'
}

function findNextId(releases) {
  const today = new Date(); today.setHours(0,0,0,0)
  const future = releases.filter(r => parseISO(r.release_date) >= today)
  return future.length ? future[0].id : null
}

export function CalendarList({ releases, loading, onEdit, onAdd }) {
  if (loading) return <p style={{color:'var(--text-3)'}}>Loading…</p>
  if (!releases.length) return (
    <div style={{color:'var(--text-3)',padding:'var(--space-5)',textAlign:'center'}}>
      No releases yet. Add one above.
    </div>
  )

  const nextId = findNextId(releases)

  return (
    <div className="cal-list">
      {releases.map(r => {
        const status = deriveStatus(r.release_date, r.id === nextId ? r.id : null)
        const isNext = r.id === nextId
        const today = new Date(); today.setHours(0,0,0,0)
        const daysUntil = differenceInDays(parseISO(r.release_date), today)

        return (
          <div
            key={r.id}
            className={`cal-item ${isNext ? 'cal-item--next' : ''} ${status === 'past' ? 'cal-item--past' : ''}`}
            onClick={() => onEdit(r)}
          >
            <div className="cal-item__date mono">{format(parseISO(r.release_date), 'dd MMM yyyy')}</div>
            <div className="cal-item__body">
              <p className="cal-item__name">{r.name}</p>
              {r.game && <p className="cal-item__game">{r.game}{r.region ? ` · ${r.region}` : ''}</p>}
              {r.note && <p className="cal-item__note">{r.note}</p>}
            </div>
            <div className="cal-item__status">
              {isNext && daysUntil >= 0 && (
                <span className="cal-item__countdown">
                  {daysUntil === 0 ? 'Today!' : `${daysUntil}d`}
                </span>
              )}
              {!isNext && <span className={`badge badge--${status}`}>{status}</span>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
```

Add to `global.css`:
```css
.cal-list { display: flex; flex-direction: column; gap: var(--space-2); }
.cal-item { display: flex; gap: var(--space-3); align-items: flex-start; background: var(--bg-surface); border: 1px solid var(--border); border-radius: var(--radius-md); padding: var(--space-3); cursor: pointer; transition: border-color 0.15s; }
.cal-item:hover { border-color: var(--gold-dim); }
.cal-item--next { border-color: var(--gold); background: rgba(201,168,76,0.06); }
.cal-item--past { opacity: 0.5; }
.cal-item__date { font-size: var(--text-xs); color: var(--text-3); min-width: 88px; padding-top: 2px; }
.cal-item__body { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.cal-item__name { font-size: var(--text-base); color: var(--text-1); }
.cal-item__game { font-size: var(--text-sm); color: var(--text-3); }
.cal-item__note { font-size: var(--text-sm); color: var(--text-2); font-style: italic; margin-top: 2px; }
.cal-item__status { display: flex; align-items: center; }
.cal-item__countdown { font-family: var(--font-mono); font-size: var(--text-sm); color: var(--gold); font-weight: 500; }
.badge--past     { background: rgba(77,106,130,0.15); color: var(--text-3); }
.badge--next     { background: rgba(201,168,76,0.15); color: var(--gold); }
.badge--upcoming { background: rgba(78,205,196,0.1); color: var(--gain); }
```

- [ ] **Step 4: Write `src/components/calendar/ReleaseForm.jsx`**

```jsx
import { useState } from 'react'
import { Modal } from '../ui/Modal'

const empty = { name:'', game:'', release_date:'', region:'', note:'' }

function toForm(r) {
  if (!r) return empty
  return { name: r.name ?? '', game: r.game ?? '', release_date: r.release_date ?? '', region: r.region ?? '', note: r.note ?? '' }
}

export function ReleaseForm({ release, onSave, onDelete, onClose }) {
  const [form, setForm] = useState(toForm(release))
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  function set(k, v) { setForm(p => ({ ...p, [k]: v })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await onSave({ name: form.name.trim(), game: form.game || null, release_date: form.release_date, region: form.region || null, note: form.note || null })
      onClose()
    } finally { setSaving(false) }
  }

  return (
    <Modal title={release ? 'Edit release' : 'Add release'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="form-grid">
        <label className="form-label">Name * <input className="input" value={form.name} onChange={e => set('name', e.target.value)} required /></label>
        <div className="form-row">
          <label className="form-label">Game <input className="input" value={form.game} onChange={e => set('game', e.target.value)} placeholder="Riftbound" /></label>
          <label className="form-label">Region <input className="input" value={form.region} onChange={e => set('region', e.target.value)} placeholder="Global" /></label>
        </div>
        <label className="form-label">Release date * <input className="input" type="date" value={form.release_date} onChange={e => set('release_date', e.target.value)} required /></label>
        <label className="form-label">Note <textarea className="input" rows={2} value={form.note} onChange={e => set('note', e.target.value)} /></label>
        <div className="form-actions">
          {release && !confirmDelete && <button type="button" className="btn btn--danger" onClick={() => setConfirmDelete(true)}>Delete</button>}
          {confirmDelete && <button type="button" className="btn btn--danger" onClick={() => { onDelete(release.id); onClose() }}>Confirm delete</button>}
          <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn--primary" disabled={saving}>{saving ? 'Saving…' : (release ? 'Save' : 'Add release')}</button>
        </div>
      </form>
    </Modal>
  )
}
```

- [ ] **Step 5: Wire up `CalendarPage.jsx`**

```jsx
import { useState } from 'react'
import { CalendarList } from '../components/calendar/CalendarList'
import { ReleaseForm } from '../components/calendar/ReleaseForm'
import { useReleaseCalendar } from '../hooks/useReleaseCalendar'

export function CalendarPage() {
  const { releases, loading, create, update, remove } = useReleaseCalendar()
  const [formRelease, setFormRelease] = useState(null)

  async function handleSave(data) {
    if (formRelease?.id) await update(formRelease.id, data)
    else await create(data)
  }

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Releases</h2>
        <button className="btn btn--primary" onClick={() => setFormRelease({})}>+ Add</button>
      </div>
      <CalendarList releases={releases} loading={loading} onEdit={r => setFormRelease(r)} onAdd={() => setFormRelease({})} />
      {formRelease !== null && (
        <ReleaseForm
          release={formRelease?.id ? formRelease : null}
          onSave={handleSave}
          onDelete={remove}
          onClose={() => setFormRelease(null)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 6: Verify calendar**

```bash
npm run dev
```

Navigate to Calendar. Should see 7 seed releases ordered by date. Past ones faded. Radiance (23 Oct 2026) highlighted as next with a day countdown. Click any entry → edit modal opens. Add a test entry → appears correctly.

- [ ] **Step 7: Commit**

```bash
git add src/services/releaseCalendar.js src/hooks/useReleaseCalendar.js src/components/calendar/ src/pages/CalendarPage.jsx
git commit -m "feat: release calendar with countdown, add/edit/delete"
```

---

## Task 12: PWA icons + deploy to Vercel

**Files:**
- Create: `public/icons/icon-192.png` and `public/icons/icon-512.png`
- No code changes needed — `vite.config.js` and `vercel.json` already written in Task 2

**Interfaces:**
- Produces: installable PWA; live Vercel URL

- [ ] **Step 1: Create placeholder PWA icons**

Generate two PNG icons (192×192 and 512×512) for "The Collector." Options:
- Use a design tool (Figma, Canva) to create a brass-on-navy icon (e.g. a stylised "C" or card-vault motif in `#c9a84c` on `#0d1b2a`)
- Or quickly generate with ImageMagick:

```bash
# Placeholder — solid navy with gold "C"
convert -size 512x512 xc:'#0d1b2a' \
  -font Helvetica -pointsize 240 -fill '#c9a84c' \
  -gravity center -annotate 0 "C" \
  public/icons/icon-512.png

convert public/icons/icon-512.png -resize 192x192 public/icons/icon-192.png
```

Replace with a proper icon before going live. The manifest already references these paths.

- [ ] **Step 2: Verify PWA manifest in browser**

```bash
npm run build
npm run preview
```

Open http://localhost:4173 in Chrome. DevTools → Application → Manifest → confirm:
- Name: "The Collector"
- Short name: "The Collector"
- Theme color: `#0d1b2a`
- Icons listed at 192 and 512

- [ ] **Step 3: Deploy to Vercel**

```bash
npm install -g vercel   # if not already installed
vercel
```

Follow prompts:
- Link to existing project or create new
- Project name: `the-collector`
- Framework: Vite
- Build command: `npm run build`
- Output directory: `dist`

Then add environment variables in Vercel dashboard → Settings → Environment Variables:
- `VITE_SUPABASE_URL` → your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` → your anon key

Redeploy after adding env vars:
```bash
vercel --prod
```

- [ ] **Step 4: Smoke test the live URL**

- Open the Vercel URL in a browser → login screen appears in navy
- Sign in → lands on Collection with all 5 seed items
- Navigate to Analytics, Calendar → both render correctly
- On iOS/Android: "Add to Home Screen" → installs as "The Collector" with the icon
- Launch from home screen → opens full-screen with no browser chrome
- No console errors

- [ ] **Step 5: Commit and tag**

```bash
git add public/icons/
git commit -m "feat: PWA icons and Vercel deployment"
git tag v1.0.0
git push origin main --tags
```

---

## Self-review against spec

| Spec requirement | Task |
|---|---|
| Vercel + Supabase | Tasks 1–2, 12 |
| PWA manifest, standalone display, home-screen icon | Tasks 2, 12 |
| Single-owner email/password auth | Task 3 |
| items schema with all fields | Task 1 |
| Three status states (owned/watchlist/sold) | Tasks 1, 7, 8 |
| price_history per item | Tasks 1, 6 |
| release_calendar | Tasks 1, 11 |
| Add/edit/delete items | Task 8 |
| Filter by category, status, value range | Task 7 |
| Sort by value, gain %, date | Tasks 6, 7 |
| Headline portfolio stats | Task 10 |
| Category breakdown chart (donut) | Task 10 |
| Portfolio value over time (aggregate) | Task 10 |
| Realized vs unrealized gains | Task 10 |
| Top gainers / losers | Task 10 |
| Per-item price history chart (full, hoverable) | Task 9 |
| % change colour-coded | Tasks 7, 9 |
| Running notes log per item | Task 9 |
| Release calendar with countdown | Task 11 |
| Status derived from date (not stored) | Task 11 |
| Design direction A (navy/gold/Fraunces) | Tasks 4, 5 |
| Mobile-first responsive layout | Tasks 4–11 |
| Empty states | Task 7 |
| Seed data (5 items, 7 releases) | Task 1 |
| CSV export | ✗ explicitly deferred to post-v1 |
| Image file upload | ✗ out of scope; URL paste only |
| Multi-user / sharing | ✗ out of scope |
| Live price fetching | ✗ out of scope |
