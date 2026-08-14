# The Collector — Deployment Guide

This document covers deploying The Collector to Vercel with a Supabase backend.

## Prerequisites

- Node.js 18+ and npm installed
- Vercel CLI: `npm install -g vercel` (or use GitHub auto-deploy)
- A Supabase project (free tier acceptable)
- GitHub account (for optional auto-deploy)

## Step 1: Supabase Setup

### Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **New Project**
3. Enter project details (e.g., "The Collector")
4. Set database password
5. Wait for provisioning to complete

### Run Migrations

1. In Supabase dashboard, go to the **SQL Editor**
2. Create a new query and paste the contents of `supabase/migrations/001_initial_schema.sql`
3. Run the migration
4. Create a new query and paste the contents of `supabase/migrations/002_seed_data.sql`
5. Run the seed

### Verify Tables and Data

In the **SQL Editor**, run:

```sql
SELECT COUNT(*) FROM items;
SELECT COUNT(*) FROM price_history;
SELECT COUNT(*) FROM release_calendar;
```

Expected: 5 items, multiple price_history rows, 7 releases.

### Create Auth User

1. Go to **Authentication** > **Users**
2. Click **Invite new user** or **Create new user**
3. Enter email and password (e.g., `collector@example.com` / `password123`)
4. Confirm the user is created

### Get API Keys

1. Go to **Settings** > **API**
2. Copy:
   - **Project URL** (used as `VITE_SUPABASE_URL`)
   - **Anon Public Key** (used as `VITE_SUPABASE_ANON_KEY`)
3. Save these — you'll need them in the next step

## Step 2: Deploy to Vercel

### Option A: Vercel CLI (Manual Deployment)

1. Ensure you're in the project root:
   ```bash
   cd /Users/mauro/Apps/Collector
   ```

2. Run Vercel CLI:
   ```bash
   vercel --prod
   ```

3. Follow prompts:
   - **Link to existing project?** → No (first deploy)
   - **Project name?** → `the-collector`
   - **Framework?** → `Vite`
   - **Build command?** → `npm run build` (default)
   - **Output directory?** → `dist` (default)

4. Vercel will deploy and output a live URL (e.g., `the-collector.vercel.app`)

### Option B: GitHub Auto-Deploy (Recommended)

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and sign in
3. Click **New Project**
4. Select your GitHub repo
5. Framework preset: **Vite**
6. Click **Deploy**
7. Once deployed, proceed to **Step 3**

## Step 3: Add Environment Variables

### Via Vercel Dashboard

1. Go to your project on [vercel.com](https://vercel.com)
2. Click **Settings** > **Environment Variables**
3. Add two variables:
   - **Name:** `VITE_SUPABASE_URL` → **Value:** _(paste from Supabase Settings > API)_
   - **Name:** `VITE_SUPABASE_ANON_KEY` → **Value:** _(paste from Supabase Settings > API)_
4. Make sure both are checked for **Production**, **Preview**, and **Development**

### Via Vercel CLI

```bash
vercel env add VITE_SUPABASE_URL
# Paste your Supabase Project URL, press Enter
# Select "Production, Preview, Development"

vercel env add VITE_SUPABASE_ANON_KEY
# Paste your Supabase Anon Public Key, press Enter
# Select "Production, Preview, Development"
```

## Step 4: Redeploy with Environment Variables

After adding environment variables, redeploy:

```bash
vercel --prod
```

Wait for deployment to complete.

## Step 5: Smoke Test

1. Open your live Vercel URL in a browser
2. Verify:
   - [ ] Login screen appears with navy theme (#0d1b2a)
   - [ ] Login with test credentials (created in Step 1)
   - [ ] Collection page loads with 5 seed items
   - [ ] Can navigate to Analytics → displays portfolio stats
   - [ ] Can navigate to Calendar → displays 7 release dates
   - [ ] Items can be filtered by category and status
   - [ ] Item detail view shows price history chart
   - [ ] No console errors (DevTools > Console)

### Mobile / PWA Test (Optional but Recommended)

1. Open the Vercel URL on iOS or Android
2. iOS: **Share** → **Add to Home Screen** → name should be "The Collector"
3. Android: **Menu** → **Install app** → should install as "The Collector"
4. Launch from home screen:
   - [ ] Opens full-screen without browser chrome
   - [ ] Icon displays the navy placeholder
   - [ ] Navigation works
   - [ ] No console errors

## Step 6: Post-Deployment

### Replace Placeholder Icon

The current icon (`public/icons/icon-512.png` and `icon-192.png`) is a solid navy placeholder. Before going live to real users:

1. Create a proper icon (e.g., brass "C" on navy background, or a card-vault motif)
2. Export two PNGs:
   - `icon-192.png` (192×192 px)
   - `icon-512.png` (512×512 px, with "maskable" safe zone)
3. Replace the files in `public/icons/`
4. Commit and push to trigger a redeploy

### DNS (Custom Domain)

If you want a custom domain:

1. Go to your Vercel project > **Settings** > **Domains**
2. Add your domain and follow DNS setup instructions
3. Point your domain registrar to Vercel nameservers

## Troubleshooting

### "White screen of death" on load

- Check browser DevTools > **Console** for errors
- Verify Supabase URL and Anon Key are correct in Vercel environment variables
- Confirm Supabase project is active and accessible
- Check that migrations ran successfully

### Login fails

- Verify the test user was created in Supabase **Authentication** > **Users**
- Confirm `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set in Vercel

### Items don't load

- In Supabase **SQL Editor**, verify:
  ```sql
  SELECT COUNT(*) FROM items;
  SELECT COUNT(*) FROM price_history;
  ```
- Ensure both return the expected counts (5 items, multiple price_history rows)

### PWA not installable

- Open DevTools > **Application** > **Manifest**
- Verify icons are listed and accessible
- Check that `display: standalone` is in the manifest
- Icons must be valid PNGs at 192×192 and 512×512 px

## Local Development

To test locally before deploying:

```bash
# Install dependencies
npm install

# Create .env.local with Supabase keys
cp .env.example .env.local
# Edit .env.local and add your Supabase credentials

# Run dev server
npm run dev

# Open http://localhost:5173
```

## Rolling Back

If you need to revert to a previous deployment:

1. Go to Vercel project > **Deployments**
2. Find the previous successful deployment
3. Click **Promote to Production**

To revert code:

```bash
git revert <commit-hash>
git push origin main
# Vercel will auto-redeploy
```

---

**Questions?** Check the [Vercel docs](https://vercel.com/docs) or [Supabase docs](https://supabase.com/docs).
