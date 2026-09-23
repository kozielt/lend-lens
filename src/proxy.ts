import { NextResponse, type NextRequest } from "next/server";

/**
 * proxy.ts is what middleware.ts became in Next 16 (Node.js runtime only). It runs before the
 * router for the matched paths, so it can still choose the HTTP status line. Here:
 *
 * - two convenience redirects: /markets and /markets/1 land on the overview, /w/<address> is a
 *   short link to a wallet;
 * - the reserve 404. Under Cache Components the reserve page streams its static shell (status 200)
 *   before the Suspense'd child awaits params and can call notFound(), so the page alone can only
 *   produce a soft 404. The proxy decides first: unknown symbol → the not-found page with a real
 *   404, wrong case → 308 to the canonical symbol, exact match → continue to the page.
 */
const CHAIN_ID = "1";
const RESERVE_PATH = /^\/markets\/([^/]+)\/([^/]+)$/;
/** Any path with no route: rendering it gives the root not-found.tsx with status 404. */
const NOT_FOUND_PATH = "/__reserve-not-found";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/markets" || pathname === "/markets/1") {
    return NextResponse.redirect(new URL("/", request.url));
  }
  if (pathname.startsWith("/w/")) {
    return NextResponse.redirect(new URL(`/wallet/${pathname.slice(3)}`, request.url), 308);
  }
  const match = RESERVE_PATH.exec(pathname);
  if (match) return reserve(request, match[1], match[2]);
  return NextResponse.next();
}

async function reserve(request: NextRequest, chainId: string, segment: string) {
  const symbol = safeDecode(segment);
  if (chainId !== CHAIN_ID || symbol === null) return notFound(request);

  const symbols = await reserveSymbols(request.nextUrl.origin);
  // The list could not be read: let the page decide (it still calls notFound() itself) rather
  // than turn an API hiccup into a 500 or a false 404.
  if (!symbols) return NextResponse.next();

  if (symbols.includes(symbol)) return NextResponse.next();
  const canonical = symbols.find((s) => s.toLowerCase() === symbol.toLowerCase());
  if (!canonical) return notFound(request);

  const url = request.nextUrl.clone();
  url.pathname = `/markets/${CHAIN_ID}/${encodeURIComponent(canonical)}`;
  return NextResponse.redirect(url, 308);
}

/**
 * The app's own JSON, served from the 'use cache' entry behind it, so this is a local round trip
 * of a few ms. Fixed path on the request's own origin: no user input goes into the URL. The
 * matcher excludes /api, so this fetch does not pass through the proxy again.
 */
async function reserveSymbols(origin: string): Promise<string[] | null> {
  try {
    const res = await fetch(`${origin}/api/reserves/${CHAIN_ID}`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;
    const body = (await res.json()) as { reserves?: { symbol: string }[] };
    return Array.isArray(body.reserves) ? body.reserves.map((r) => r.symbol) : null;
  } catch {
    return null;
  }
}

function notFound(request: NextRequest) {
  return NextResponse.rewrite(new URL(NOT_FOUND_PATH, request.url));
}

function safeDecode(segment: string): string | null {
  try {
    return decodeURIComponent(segment);
  } catch {
    return null;
  }
}

export const config = { matcher: ["/markets", "/markets/1", "/markets/:chainId/:reserve", "/w/:path*"] };
