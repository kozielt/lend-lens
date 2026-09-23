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
