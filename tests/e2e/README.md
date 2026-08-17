# End-to-end harness

`vault.mjs` drives the real app in Chromium against a **stubbed Supabase**: every
request to the project host is intercepted and fulfilled locally. Nothing touches
the live database, and no credentials are needed.

Everything above the network is real — login flow, the collection view toggle and
its persistence, image compression in the browser, and the exact payload the app
sends on insert.

```bash
npm run dev                 # in one shell
node tests/e2e/vault.mjs    # in another
```

Requires Playwright (`npm i -D playwright`) and a Chromium install. It is kept out
of `npm test` because it needs a running dev server; CI runs the Vitest suite only.

Two notes if a run looks wrong:

- PostgREST returns a **bare object** when `.single()` sets the
  `vnd.pgrst.object+json` Accept header. An early version of this stub always
  returned an array, which stored an array as a list item and produced a phantom
  React key warning — the bug was in the stub, not the app.
- Google Fonts may fail to load in a sandboxed environment. That is the container's
  egress policy, not the app, and only changes which typeface renders.
