import { NextResponse, type NextRequest } from "next/server";

/**
 * proxy.ts is what middleware.ts became in Next 16 (Node.js runtime only). It runs before the
 * router for the matched paths. Here: two convenience redirects, so /markets and /markets/1
 * land on the overview and /w/<address> is a short link to a wallet.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/markets" || pathname === "/markets/1") {
    return NextResponse.redirect(new URL("/", request.url));
  }
  if (pathname.startsWith("/w/")) {
    return NextResponse.redirect(new URL(`/wallet/${pathname.slice(3)}`, request.url), 308);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/markets", "/markets/1", "/w/:path*"] };
