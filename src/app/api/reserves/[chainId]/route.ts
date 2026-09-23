import { getMarketOverview, MARKET } from "@/lib/aave/data";

/**
 * Route Handler: GET /api/reserves/1
 *
 * Under Cache Components a GET that only touches cached data is prerendered like a page, so this
 * JSON is served statically and refreshed when the 'markets' tag is invalidated. (Without
 * cacheComponents, GET handlers are dynamic by default since Next 15 and you would write
 * `export const dynamic = 'force-static'` to get the same effect.) `'use cache'` cannot sit on
 * the handler itself; it lives in the helper we call.
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
