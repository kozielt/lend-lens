import { getMarketOverview, MARKET } from "@/lib/aave/data";

/**
 * Route Handler: GET /api/reserves/1
 *
 * The build lists this route as ƒ (dynamic): it awaits `params`, so the handler runs per
 * request. It is still cheap and consistent because the data comes from the `'use cache'`
 * entry: two consecutive calls return the same `cachedAt` until the 'markets' tag is
 * invalidated. (Without cacheComponents, GET handlers are dynamic by default since Next 15
 * and `export const dynamic = 'force-static'` would prerender them; that export is not
 * allowed under cacheComponents.) `'use cache'` cannot sit on the handler itself; it lives
 * in the helper we call.
 */
export async function GET(_request: Request, ctx: RouteContext<"/api/reserves/[chainId]">) {
  const { chainId } = await ctx.params;
  if (Number(chainId) !== MARKET.chainId) {
    return Response.json({ error: `Only chainId ${MARKET.chainId} is served` }, { status: 404 });
  }
  const market = await getMarketOverview();
  return Response.json({
    market: { name: market.name, address: market.address, chainId: market.chain.chainId },
    cachedAt: market.cachedAt,
    reserves: market.reserves.map((r) => ({
      symbol: r.underlyingToken.symbol,
      address: r.underlyingToken.address,
      suppliedUsd: r.size.usd,
      supplyApy: r.supplyInfo.apy.value,
      borrowApy: r.borrowInfo?.apy.value ?? null,
      liquidationThreshold: r.supplyInfo.liquidationThreshold.value,
      maxLtv: r.supplyInfo.maxLTV.value,
      canBeCollateral: r.supplyInfo.canBeCollateral,
      isFrozen: r.isFrozen,
    })),
  });
}
