# Notes — where Next.js 16 differs from plain React / JS

Running log of things that surprised me while building this. One entry per surprise:
what I expected, what happened, why, and the fix. Newest at the bottom.

---

## 2026-09-23 · `bigint` literals need `target: ES2020` or higher

- **Expected:** `10n ** 18n` just works; Node 25 supports it.
- **Happened:** `tsc` failed with "BigInt literals are not available when targeting lower than ES2020". `create-next-app` sets `"target": "ES2017"`.
- **Why:** Next transpiles with SWC and does not care about `target`, but `tsc --noEmit` does.
- **Fix:** `"target": "ES2022"` in `tsconfig.json`. Also delete `tsconfig.tsbuildinfo` after the change; `incremental: true` cached the old errors.

## 2026-09-23 · Route types are generated, and go stale

- **Expected:** `PageProps<'/wallet/[address]'>` is a normal type import.
- **Happened:** `Type '"/wallet/[address]"' does not satisfy the constraint '"/"'` after adding new routes.
- **Why:** `PageProps`, `LayoutProps`, `RouteContext` are globals generated into `.next/types` by `next dev` / `next build` / `next typegen`. Until you run one of them, the types only know the routes that existed last time.
- **Fix:** `npx next typegen` before `tsc`; in CI, `next build` does it.

## 2026-09-23 · The address book's ABI barrel does not export `IPool`

- **Expected:** `import { IPool_ABI } from '@bgd-labs/aave-address-book/abis'`.
- **Happened:** "does not provide an export named 'IPool_ABI'" at runtime, even though `dist/abis/IPool.d.ts` exists.
- **Why:** the `abis` index only re-exports a curated subset.
- **Fix:** `parseAbi(['function getUserAccountData(address) view returns (...)'])` from viem. One function, one line, nothing else in the bundle.

## 2026-09-23 · `notFound()` after the shell streamed is a soft 404 (status 200)

- **Expected:** `/markets/1/NOPE` → HTTP 404.
- **Happened:** HTTP 200 with the not-found page in the body.
- **Why:** under Cache Components the reserve symbol is runtime data awaited inside `<Suspense>`. The static shell (and the 200 status line) is already on the wire when `notFound()` throws; the 404 can only be a client-side transition.
- **Fix:** decide before streaming: in `proxy.ts` (see the proxy task), or restructure so the check happens before any Suspense boundary.

## 2026-09-23 · Production redacts Server Component error messages

- **Expected:** my `InvalidAddressError("… is not an EVM address")` shows up in `error.tsx`.
- **Happened:** in `next start` the boundary receives a generic message plus a `digest`; the real text is only in the server log. In `next dev` the full message shows.
- **Why:** deliberate: server errors may contain secrets, so only the digest reaches the client.
- **Fix:** *expected* errors (bad input) are returned/rendered as state, not thrown. Throwing is for *unexpected* failures where a generic message is right.

## 2026-09-23 · `notFound()` and `redirect()` throw, so `try/catch` swallows them

- **Expected:** a helper that wraps a fetch in `try/catch` and calls `notFound()` in the `catch`.
- **Happened / Why:** both work by throwing a special error that Next catches higher up. A `catch (e)` around them eats the signal. Same for the "bail out to dynamic rendering" errors in route handlers.
- **Fix:** call them outside `try/catch`, or rethrow with `unstable_rethrow(e)` first.

## 2026-09-23 · `cacheLife('seconds')` is excluded from the prerender

- **Expected:** every `'use cache'` block ends up in the static shell.
- **Happened / Why:** per the docs, a profile with `expire` under five minutes or `stale` under thirty seconds is treated as too short to prerender: the block becomes a dynamic hole streamed at request time (so it must sit under `<Suspense>`). The `seconds` preset is the only built-in one that trips this.
- **Fix:** use `minutes` or longer for anything that should be in the shell; use `seconds` on purpose when you want "almost live" with request coalescing.

## 2026-09-23 · `next dev` never caches; test caching with `next build && next start`

- **Expected:** the `cached · hh:mm:ss` tag to stay put across reloads in dev.
- **Happened:** it changed every reload.
- **Why:** dev re-executes cached functions to give you fresh code; the HMR hash is even part of the cache key.
- **Fix:** any assertion about caching, streaming chunks or the route table (○ ◐ ƒ) is made against the production server.

## 2026-09-23 · Error boundaries do not render during SSR; `curl` never sees `error.tsx`

- **Expected:** with the Aave API down, `curl /wallet/0x…` returns the `error.tsx` markup.
- **Happened:** 200 with the Suspense skeleton in the HTML; the error (message redacted, `digest` kept) is only in the RSC payload. `error.tsx` renders in the browser after hydration.
- **Why:** React's server renderer does not run error boundaries. A throw inside a Suspense boundary makes it emit the fallback and leave that subtree to the client, which throws again and hits the boundary.
- **Fix:** nothing to fix for truly unexpected errors, but it is one more reason to render *expected* failures as state: `<InvalidAddress/>` and the inline "could not …" lines are in the HTML (verified with `curl` against `next start`).

## 2026-09-23 · `use()` on a rejected promise: settle it on the server instead of a client boundary

- **Expected:** the APY chart needs a small client error boundary (class with `getDerivedStateFromError`) around `use(dataPromise)`.
- **Happened / Why:** three options. (1) A hand-written class boundary would also catch the `notFound()`/`redirect()` signals and only shows up after hydration (see above). (2) `catchError` from `next/error` (stable in 16.3) is the docs' tool for *uncaught* component-level errors: it lets framework signals through and gives `retry()`. (3) The error-handling docs say failed requests are *expected* errors to be modelled as return values.
- **Fix:** (3). `settle(promise, reason)` in `src/lib/settle.ts` resolves to `{ ok: true, value } | { ok: false, reason }`, so the promise handed to `use()` never rejects and the chart renders `<Failed/>` inline, server-rendered. `reason` is our own string (production would redact the real message anyway); the real error goes to the server log. `catchError` stays the pick if a block ever needs its own retry button.

## 2026-09-23 · A `try/catch` (or `.catch`) must `unstable_rethrow` first

- **Expected:** catching around a data call only sees data errors.
- **Happened / Why:** per the `unstable_rethrow` docs it can also see `notFound()`/`redirect()` and, for `fetch(…, { cache: 'no-store' })`, the prerender bail-out. `getLiveRates` and `getApyHistory` are exactly such fetches.
- **Fix:** `settle` calls `unstable_rethrow(err)` at the top of its rejection handler (the docs allow it in a `.catch`); a unit test checks `notFound()` still propagates.

## 2026-09-23 · A cached error reaches even a *server* caller redacted

- **Expected:** `settle` logs `TypeError: fetch failed` for `getMarketOverview()`.
- **Happened:** on a revalidation it logged "An error occurred in the Server Components render. The specific message is omitted in production builds…" with a digest; the real `TypeError` is logged separately by Next under the same digest.
- **Why:** a `'use cache'` function runs as its own RSC render and its result (or error) is serialised, so the caller gets the redacted production error, same as a Client Component would.
- **Fix:** match log lines by digest; never branch on `error.message` of something that came out of a cache scope.

## 2026-09-23 · API down: warm cache degrades, cold cache is a 500, and the build needs the API

- Warm (`pnpm build` normally, then `AAVE_API_URL=http://127.0.0.1:1 pnpm start`): `/` is 200, the shell and `MarketTable` come from the prerender (cached timestamp unchanged), `LiveRates` shows the inline error. Past the 1 min revalidate, the background regeneration fails and the stale entry keeps being served (stale-while-revalidate until the 1 h expire); the failed render is not stored. `/markets/1/WETH`: parameters from the prerender, chart shows its inline error.
- Cold (prerendered `index.*` removed from `.next/server/app`, same env): `/` is a **500**, even though `MarketTable` catches. An error thrown inside a `'use cache'` function during a prerender fails the whole prerender, caught or not; it is retried on every request and recovers once the API is back (same setup with a working API regenerates `index.*` and returns 200).
- Build with the API down fails: "Export encountered an error on /markets/1/WETH" (a `generateStaticParams` path; `Reserve` has no catch, and per the above a catch would not help).
- Possible follow-up, not done: catch inside the cached function and switch it to `cacheLife('seconds')` on failure, so a failure is a short-lived dynamic hole instead of a failed prerender.

## 2026-09-23 · `refresh()` in a Server Action, next to `updateTag`

- **Expected:** `updateTag('wallet:…')` refreshes the whole wallet page, including the uncached on-chain line.
- **Happened / Why:** per the docs `updateTag`, `revalidatePath` and `refresh` all re-render the current route in the action response, but only `refresh()` says what it is for: dynamic reads that have no tag. It can **only** be called from a Server Action (not a Route Handler); it does not touch cached entries.
- **Fix:** `refreshWallet` calls both: `updateTag` for positions, `refresh()` for the on-chain line (which is also its retry after an RPC failure).

## 2026-09-23 · `preload` + `React.cache` + a failing call = an unhandled rejection

- **Expected:** `void getOnChainAccount(address)` is a harmless fire-and-forget.
- **Happened / Why:** if the RPC fails before `<OnChain/>` awaits the memoised promise, nothing has a handler on it yet. With `RPC_URL=http://127.0.0.1:1` the rejection is instant.
- **Fix:** `getOnChainAccount(address).catch(() => {})` in `preloadAccount`: marks it handled; `<OnChain/>` still sees the rejection on the same promise and renders it inline.
