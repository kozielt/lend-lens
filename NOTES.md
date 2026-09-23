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
- **Fix:** decide before streaming, in `proxy.ts`: look the symbol up and `NextResponse.rewrite` unknown ones to a path with no route. That serves the prerendered root `not-found.tsx` with a real 404 (see the proxy entry below). The page's own `notFound()` stays as the fallback and still gives the soft 404 if the proxy lets a request through.

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

## 2026-09-23 · Docker: standalone output runs as-is, but `public/` is not optional in the Dockerfile

- **Expected:** the stock multi-stage Dockerfile (`output: 'standalone'`, `node server.js`) builds first time.
- **Happened:** `next build` inside the image was fine, then `COPY --from=builder /app/public ./public` failed with `"/app/public": not found`. This app has no `public/` folder, and Docker `COPY` does not skip missing sources.
- **Why:** `.next/standalone` holds `server.js`, the traced `node_modules` and the server bundles, but per the `output` docs it does *not* include `public/` or `.next/static`; you copy them next to `server.js` yourself. The template assumes `public/` exists.
- **Fix:** `mkdir -p public` in the builder stage after `pnpm build`, so the copy works whether or not the folder exists. Other things that already had to be right: pnpm through `corepack enable` (version from `packageManager`), `pnpm-workspace.yaml` copied with the lockfile, `HOSTNAME=0.0.0.0` so the server is reachable through the published port, and `.env*` kept out of the build context (pass `RPC_URL` / `REVALIDATE_SECRET` with `-e`). The build prerenders from the live Aave API, so `docker build` needs network. Image: `node:22-alpine`, non-root user, 74.5 MB content size.
- **One difference vs Vercel:** the `use cache` store is per instance. `'use cache'` entries live in the default in-memory LRU handler of this one container (prerendered pages on its disk); nothing is shared between containers, `revalidateTag` only invalidates this instance, and a `docker restart` gave a new `cachedAt` on the next request. On Vercel the cache is shared across instances. Sharing it when self-hosting means a custom `cacheHandlers` entry (Redis etc.).

Verified with `docker run -p 3123:3000` and `curl`:

| Request | Result |
| --- | --- |
| `GET /` | 200, `Transfer-Encoding: chunked`, `x-nextjs-postponed: 1`; has "Live rates" and "Reserves". TTFB 7–12 ms, total 125–180 ms (warm) |
| `GET /_next/static/chunks/*.js` | 200, `Cache-Control: public, max-age=31536000, immutable` |
| `GET /markets/1/WETH` | 200, has "Reserve parameters" (TTFB 9 ms, total 88 ms) |
| `GET /markets/1/LINK` | 200, first hit 299 ms (on-demand render), then 86–89 ms |
| `GET /wallet/0x9886…06EC` | 200, has "Computed here" |
| `GET /api/reserves/1` | 200 JSON, 67 reserves; two hits return the same `cachedAt` |
| `POST /api/revalidate` | 200 `{"revalidated":"markets",…}`; next GET still old `cachedAt` (stale), the one after has a new one |
| `GET /markets` | 307 → `/` |
| `GET /w/0xabc` | 308 → `/wallet/0xabc` |
| `GET /lab` | 200 |
## 2026-09-23 · Proxy `rewrite` to a path with no route is a real 404

- **Expected:** the risky part of the proxy fix: a rewrite might keep the 200, or render something other than my `not-found.tsx`, so I would need a dedicated route that calls `notFound()` before any Suspense.
- **Happened:** `NextResponse.rewrite(new URL('/__reserve-not-found', request.url))` returns `404 Not Found` with `Content-Length` (not chunked), the root `not-found.tsx` inside the root layout, `<meta name="robots" content="noindex">`, and `x-nextjs-cache: HIT`. RSC requests (`RSC: 1`) get 404 too. No fallback route needed.
- **Why:** after the proxy, the rewritten path goes through normal routing, matches nothing, and Next serves `/_not-found`, which the build prerendered as static (`○ /_not-found`). A static response has no shell to stream first, so the status line can still say 404. The browser keeps the original URL.
- **Also:** grepping the HTML for `Not found` is a bad test: every page's RSC payload carries the root not-found tree as the layout's `notFound` slot, so `/` and `/markets/1/WETH` "contain" it too. Grep for the rendered `<h1 …>Not found</h1>` instead.
- **Also:** the proxy's own-origin `fetch` to `/api/reserves/1` does not loop because the matcher does not cover `/api`. Under `next start`, `request.nextUrl.origin` did not follow a spoofed `Host` header (the fetch still reached the server). The redirect built from `request.nextUrl.clone()` keeps the query string (`/markets/1/weth?x=1` → `/markets/1/WETH?x=1`).
- **Also:** `/api/reserves/[chainId]` shows as `ƒ` in the route table, not prerendered, despite the handler's comment: the `[chainId]` param makes it dynamic. It is still cheap (~2 ms locally) because `getMarketOverview()` is a `'use cache'` hit.
- **Cost:** TTFB of `/markets/1/WETH` went from ~1.9 ms to ~4–4.6 ms locally (one extra local HTTP round trip). `time_total` (~67 → ~70 ms) is dominated by the streamed APY chart fetch, so the change is within noise.
- **Fix / pattern:** unknown → rewrite to a path with no route (404); wrong case → 308 to the canonical symbol; exact → `NextResponse.next()`; if the list cannot be fetched → `NextResponse.next()` and let the page decide (checked by pointing the fetch at `/api/reserves/2`: `/markets/1/NOPE` fell back to the page's soft 404 with 200, `/markets/1/WETH` still rendered, no 500).
## 2026-09-23 · Closed-over variables are part of a `'use cache'` key

- **Expected:** an inner `async () => { 'use cache'; … who … }` with no arguments has one entry.
- **Happened:** `who = alice` and `who = bob` got separate entries (`#5`, `#6`); a second `alice` call was a hit (`#5` again).
- **Why:** the compiler lifts the inner function out and binds every captured variable as a hidden argument, so captures are serialized into the key like arguments. Module-level variables are not captured (the run counter `n` is shared state, not key).
- **Fix:** nothing to fix; just know it. Keep captures small and serializable; a captured class instance or function fails like an argument would.

## 2026-09-23 · `'use cache: private'` is the only cache scope that may read cookies

- **Expected:** "private" = stored per user on the server.
- **Happened / Why:** it may read `cookies()`, `headers()`, `searchParams` (not `connection()`). It runs at request time, is excluded from the static shell, and is **never stored on the server** across requests: only deduped within one request and kept by the client router for its `stale` time. `next start`: timestamp and `#n` changed on every GET; `curl -b 'lab-theme=dark'` rendered "dark".
- **Fix:** render it under `<Suspense>`; give it an explicit `cacheLife` (`{ stale: 30 }` here: at least 30 s so per-link prefetch still works).

## 2026-09-23 · `cookies()` inside a plain `'use cache'`

- **Expected:** a build error.
- **Happened:** `next dev` rendered the route (200) and logged: "Error: Route /lab/cache/broken used \`cookies()\` inside "use cache". Accessing Dynamic data sources inside a cache scope is not supported. If you need this data inside a cached function use \`cookies()\` outside of the cached function and pass the required dynamic data in as an argument." (`next-request-in-use-cache`, `environmentName: 'Cache'`). The docs warn that on a dynamic route it can pass `next build` and only fail under `next start`.
- **Fix:** read the cookie outside and pass the value in (it joins the key), or use `'use cache: private'`. The broken route was deleted after capturing the message.

## 2026-09-23 · `cacheLife('seconds')` builds fine; no inline-profile fallback needed

- **Expected:** the planned risk: `next build` might reject `seconds`.
- **Happened:** build passed, `/lab/cache` is ◐, and the HTML has exactly two streamed holes (`B:0`, `B:1`): the private card and the `seconds` card. Everything `minutes` is in the shell. Under `next start` the `seconds` stamp re-ran on the first GET more than 1 s after the previous one (not stale-once), while `minutes` stamps did not move.
- **Fix:** none. `seconds` must sit under `<Suspense>`; that is the whole requirement.

## 2026-09-23 · `updateTag` vs `revalidateTag(tag, 'max')`, observed

- **Expected:** both "refresh the data".
- **Happened:** `updateTag('lab')` from a button: the same action response re-rendered every `lab` stamp with a new `#n` (`#3` → `#19`). `revalidateTag('lab', 'max')` from a button: the page kept `#19`; the next GET still served `#19`, the one after served `#27` (fresh). Also, the first GET after `next start` served the build-time stamps (over a minute old) and regenerated in the background: the route shell itself is stale-while-revalidate at the `minutes` rate.
- **Why:** `updateTag` expires the tag now and the next read blocks (read-your-own-writes; Server Actions only). `revalidateTag(…, 'max')` only marks it stale: the next reader gets the old entry while the refresh runs.
- **Fix:** `updateTag` for "user just changed this", `revalidateTag(…, 'max')` for webhooks and Route Handlers.
## 2026-09-23 · `bigint` props cross the boundary fine

- **Expected:** passing a viem `bigint` to a `'use client'` component throws "not serializable".
- **Happened:** it arrives as a real `bigint` (`typeof` → `"bigint"`). React 19's RSC payload encodes it as `$n<digits>`.
- **Why:** React's serializer supports bigint; `JSON.stringify` does not: `TypeError: Do not know how to serialize a BigInt` (Route Handlers, `Response.json`, storage).
- **Fix:** still format on the server (`formatUnits(wei, 18)`) since decimals live there and the client needs no viem; never JSON-encode a raw bigint. The failing sub-route became `/lab/boundary/function` instead of `/bigint`.

## 2026-09-23 · Function and class-instance props throw at render time

- **Happened (`next dev` log, and `error.message` in dev):**
  - `Error: Functions cannot be passed directly to Client Components unless you explicitly expose it by marking it with "use server". Or maybe you meant to call this function rather than return it.` followed by `<... value={function value}>`.
  - `Error: Only plain objects, and a few built-ins, can be passed to Client Components from Server Components. Classes or null prototypes are not supported.` followed by `<... value={{amount: "1.5", symbol: "WETH"}}>`.
- **Class instance:** does *not* degrade to a plain object; it throws (any prototype other than `Object.prototype`). `{ ...instance }` or picking fields gives plain data; rebuild with `new Money(...)` on the client.
- **Production:** the boundary gets `Minified React error #441` ("An error occurred in the Server Components render…") plus a `digest`; the real text is only in the server log.
- **Also:** the failing render must be request-time (`await connection()` inside `<Suspense>`), otherwise the build's prerender hits it. Then the status is 200, and the SSR HTML holds only the Suspense fallback plus the error in the RSC payload: `error.tsx` appears after hydration, so `curl` never shows the boundary text; a browser does.

## 2026-09-23 · `server-only` in a client module is a build error, with two messages

- **Happened (`next build`, Turbopack):** `Error: Turbopack build failed with 2 errors:`
  - `You're importing a module that depends on "server-only" into a React Client Component module. This API is only available in Server Components but one of its parents is marked with "use client", so this module is also a Client Component.`
  - `'server-only' cannot be imported from a Client Component module. It should only be used from a Server Component.`
  - each followed by import traces (Server Component / Client Component Browser / Client Component SSR).
- **Fix:** import it only from Server Components; hand the result, or a server subtree via `children`, to the client.

## 2026-09-23 · Date/Map/Set cross; locale formatting is the hydration trap

- **Happened:** `Date`, `Map`, `Set` arrive as real instances (`instanceof` true).
- **Trap:** `date.toLocaleString()` in a client component runs twice: SSR with the server's timezone/locale, hydration with the browser's. Different output → hydration error, React client-renders up to the nearest boundary. Locally both sides share a timezone, so it only bites in production (UTC server).
- **Fix:** format on one side (ISO / fixed `timeZone` in `Intl.DateTimeFormat`), or `suppressHydrationWarning` on that one element (the DOM wins, per the docs).
