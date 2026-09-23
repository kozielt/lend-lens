# lend-lens

A small dashboard on live Aave V3 Ethereum lending data: markets, reserves and wallet health
factors, read-only, from a public API with no keys. It is a learning project: I built it to see
how Next.js 16 decides what is static, cached or streamed, with the model in my hands instead of
in the docs. The one rule of the app: every block on screen carries a **static / cached / live**
tag with the time it was produced. Not affiliated with Aave.

## Live

Deployed at: _(Vercel URL to be added)_

The same build also runs in Docker (see [Deploy](#deploy)).

## What each file proves

Route-table symbols are from `pnpm build`: ○ static, ◐ partial prerender (static shell + streamed
holes), ƒ dynamic. URLs are relative to `http://localhost:3000` under `pnpm start`.

| File | Concept | How to see it |
| --- | --- | --- |
| `src/app/layout.tsx` | Root layout with no data: part of every page's static shell | `curl -N /`: nav and footer are in the first chunk |
| `src/app/page.tsx` | Two modes on one page: reserves table (`'use cache'`, in the shell) and live rates (uncached, streamed behind Suspense) | `◐ / 1m 1h` in the build; `curl -N /` shows the skeleton, then the rates chunk |
| `src/app/actions.ts` | Server Functions: `updateTag` (read-your-own-writes), `refresh()` for untagged reads, a form action that redirects | Click **Refresh (updateTag)** on `/`: the `cached` time changes in the same response |
| `src/app/markets/[chainId]/[reserve]/page.tsx` | `generateStaticParams` for 3 reserves, others rendered on first visit and kept; `params` is a Promise awaited under Suspense; a promise handed to a client chart | Build lists `◐ /markets/1/WETH` + 2 more; open `/markets/1/LINK` twice (slow, then fast) |
| `src/app/markets/[chainId]/[reserve]/loading.tsx` | Segment-level Suspense fallback | Click a reserve on `/`: skeleton before the page |
| `src/app/not-found.tsx` | Root 404 page, also the target of the proxy's rewrite | `curl -I /markets/1/NOPE` → `404` |
| `src/app/wallet/page.tsx` | Static page; `<form action>` posting to a Server Function, works with JS off | `○ /wallet`; disable JS, submit an address |
| `src/app/wallet/[address]/page.tsx` | Three modes on one screen: positions cached per address, on-chain read per request, async `params`; a bad address is rendered state, not a throw | `/wallet/0x9886C9c2A743dE2D82A182207F2028a8a74906EC`; `/wallet/notanaddress` says "Not a wallet address" |
| `src/app/wallet/[address]/error.tsx` | Error boundary for unexpected failures: generic message, `digest`, `retry()` | `AAVE_API_URL=http://127.0.0.1:1 pnpm start`, open an unvisited wallet in a browser (`curl` only sees the skeleton) |
| `src/app/api/reserves/[chainId]/route.ts` | GET Route Handler whose JSON comes from a `'use cache'` helper | `curl /api/reserves/1` twice: same `cachedAt` (it is `ƒ` in the build: the `[chainId]` param) |
| `src/app/api/revalidate/route.ts` | Webhook invalidation: `revalidateTag('markets', 'max')` = stale-while-revalidate; optional bearer secret | `curl -X POST /api/revalidate`, then reload `/` twice: old time once, new time after |
| `src/app/lab/page.tsx` | Static index of the drills | `○ /lab` |
| `src/app/lab/boundary/page.tsx` | What crosses server → client: bigint, Date/Map/Set, promise + `use()`, `children` slot | `/lab/boundary`, one card per case |
| `src/app/lab/actions.ts` | The one kind of function a Client Component may receive: a Server Function | `/lab/boundary`: **Call the Server Function** |
| `src/app/lab/boundary/secret.ts` | `server-only` module: importing it from a `'use client'` file is a build error | `/lab/boundary`, "children slot" card: `typeof window = undefined` |
| `src/app/lab/boundary/function/page.tsx`, `src/app/lab/boundary/function/error.tsx`, `src/app/lab/boundary/class/page.tsx`, `src/app/lab/boundary/class/error.tsx` | Function and class-instance props throw at render time, caught by the segment's own `error.tsx` | `/lab/boundary/function`, `/lab/boundary/class` |
| `src/app/lab/cache/page.tsx` | What makes a cache key: arguments, closures, private cache, tag vs time | `◐ /lab/cache 1m 1h`; reload and compare `#n` |
| `src/app/lab/cache/actions.ts` | `updateTag` vs `revalidateTag(…, 'max')`; a cookie set only from a Server Function | The three buttons on `/lab/cache` |
| `src/app/globals.css`, `src/app/favicon.ico` | Tailwind v4 tokens; favicon file convention | – |
| `src/lib/aave/data.ts` | The data layer: every caching decision in one file (`'use cache'`, uncached, `React.cache`) | The tags on `/` and on a wallet page |
| `src/lib/aave/api.ts` | `server-only` GraphQL client, one POST per query; `AAVE_API_URL` override | `AAVE_API_URL=http://127.0.0.1:1 pnpm start`: `/` still renders, live blocks show inline errors |
| `src/lib/aave/queries.ts`, `src/lib/aave/types.ts` | GraphQL documents as plain strings and the shapes selected; no codegen | – |
| `src/lib/viem.ts` | The one chain read, `Pool.getUserAccountData`; `server-only`, `RPC_URL` | "on chain at block …" line on a wallet page |
| `src/lib/decimal.ts` | Exact decimal maths on `bigint`, no floats | `pnpm test` |
| `src/lib/health.ts` | Health factor from positions, pure and tested | Wallet page: "Computed here" next to "Aave API says" |
| `src/lib/format.ts` | Display formatting; `Number` only at the last step | – |
| `src/lib/settle.ts` | A streamed block renders its own failure; `unstable_rethrow` first | `RPC_URL=http://127.0.0.1:1 pnpm start`: only the on-chain line fails |
| `src/lib/lab/cache.ts` | Four tiny cached functions: argument key, closure key, `'use cache: private'`, `cacheLife('seconds')` | `/lab/cache` |
| `src/lib/__tests__/decimal.test.ts`, `src/lib/__tests__/health.test.ts`, `src/lib/__tests__/settle.test.ts` | Unit tests for the pure logic | `pnpm test` |
| `src/components/ui.tsx` | The `<Mode>` tag, `Case` card, inline `Failed` line | Every page |
| `src/components/RefreshButton.tsx` | Client Component calling a Server Function prop inside a transition | Any Refresh button |
| `src/components/ApyChart.tsx` | Client Component reading a server promise with `use()` | `/markets/1/WETH`: chart streams in |
| `src/components/lab/*` | Client leaves for the boundary drill | `/lab/boundary` |
| `src/proxy.ts` | `proxy.ts` (was `middleware.ts`): redirects, a real 404 before streaming, 308 to the canonical symbol | `curl -I /markets/1/weth` → `308`; `curl -I /w/0xabc` → `308`; build shows `ƒ Proxy` |
| `next.config.ts` | `cacheComponents: true` (explicit caching + PPR), `output: 'standalone'` | Build prints "Cache Components enabled" |
| `Dockerfile` | Standalone output on plain Node, no Vercel | See [Deploy](#deploy) |

## Run it

```bash
pnpm install
pnpm dev          # http://localhost:3000 — dev NEVER caches: every tag changes on reload
pnpm test         # vitest: decimal, health factor, settle
pnpm lint
pnpm typecheck    # on a fresh clone run `pnpm build` or `npx next typegen` first (route types are generated)
pnpm build && pnpm start   # the only way to see caching, streaming and the route table
curl -N http://localhost:3000/   # watch the shell, then the live-rates chunk
```

The build prerenders from the live Aave API, so it needs network.

## Deploy

**Vercel.** Import the GitHub repo at [vercel.com/new](https://vercel.com/new), keep the defaults,
no env vars needed. Optional: `RPC_URL` (a keyed node if the public one rate-limits) and
`REVALIDATE_SECRET` (then `POST /api/revalidate` needs `Authorization: Bearer <secret>`).
Hobby plan: non-commercial use only, and hitting a usage cap pauses the project until the cycle
resets; functions have cold starts. Vercel-only things this app does not use: Analytics, Speed
Insights, Cron, KV/Blob, Skew Protection. The one implicit dependency is Vercel's Data Cache,
which shares the `'use cache'` store across instances.

**Docker.**

```bash
docker build -t lend-lens .
docker run -p 3000:3000 lend-lens      # add -e RPC_URL=… -e REVALIDATE_SECRET=… as needed
```

One behavioural difference: the `'use cache'` store is per instance (in-memory, on this container),
so two containers do not share entries and `revalidateTag` only invalidates the one it hits.

The same standalone output deploys anywhere Node runs, e.g. Netlify via its Next.js adapter.

## The caching timeline in 20 seconds

In 13.4 the App Router went stable and cached implicitly: `fetch` results, GET Route Handlers and
page segments in the client router cache were all cached by default. 15 (Oct 2024) flipped that:
`fetch`, GET handlers and client-side page segments are no longer cached by default, and
`params`, `cookies()`, `headers()` became async (with a temporary sync fallback). 16 (Oct 2025)
made caching explicit with Cache Components, opt in via `cacheComponents: true`: nothing is
cached unless it says `'use cache'`, lifetime and invalidation come from `cacheLife` and `cacheTag`
(now stable), Partial Prerendering is the default rendering model under that flag, the sync
fallback for request APIs is gone, and `proxy.ts` replaces the deprecated `middleware.ts`. This
app uses three modes: `'use cache'` + `cacheLife` + `cacheTag` (shared entries, in the shell),
uncached reads awaited under `<Suspense>` (streamed per request), and `React.cache` for
per-request dedupe only. And two invalidation styles: `updateTag` (Server Actions only,
read-your-own-writes, the Refresh buttons) versus `revalidateTag(tag, 'max')`
(stale-while-revalidate, the webhook).

## Notes

[`NOTES.md`](./NOTES.md): everything that surprised me, with the fix.

## Data

- [Aave V3 GraphQL API](https://api.v3.aave.com/graphql): markets, reserves, APY history, user positions.
- A keyless public Ethereum RPC (`https://ethereum.publicnode.com`, override with `RPC_URL`) for one
  contract read, `Pool.getUserAccountData`.

One market only: Aave V3 Ethereum core. Health factor = Σ (collateral in USD × liquidation
threshold) ÷ Σ debt in USD; below 1 the position can be liquidated. The wallet page shows the value
computed locally (`src/lib/health.ts`) next to the API's and the chain's.
