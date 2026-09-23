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
