import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { cache } from "react";
import { ETHEREUM_CORE_MARKET, gql } from "./api";
import { APY_HISTORY, LIVE_RATES, MARKET_OVERVIEW, RESERVE_DETAIL, USER_POSITIONS } from "./queries";
import type { ApySample, LiveRate, MarketOverview, ReserveDetail, UserBorrow, UserMarketState, UserSupply } from "./types";
import { readUserAccountData, type OnChainAccountData } from "../viem";
import type { Address } from "viem";

/**
 * The data layer is where the caching decisions live. Each function says which of the
 * three modes it is in, and why:
 *
 *   'use cache' + cacheLife('minutes') + cacheTag('markets')   → shared, revalidated by tag or time
 *   plain async (no directive)                                  → per request, must stream inside <Suspense>
 *   React.cache(...)                                            → per request dedupe only (no storage)
 */

export const MARKET = ETHEREUM_CORE_MARKET;
export const MARKETS_TAG = "markets";
export const walletTag = (address: string) => `wallet:${address.toLowerCase()}`;

/** Market table: reserve list, sizes, risk parameters. Changes slowly → cached for minutes, invalidated by tag. */
export async function getMarketOverview(): Promise<MarketOverview & { cachedAt: string }> {
  "use cache";
  cacheLife("minutes");
  cacheTag(MARKETS_TAG);
  const { market } = await gql<{ market: MarketOverview | null }>(MARKET_OVERVIEW, MARKET);
  if (!market) throw new Error("Aave API returned no market");
  // Allowed inside a cache scope: the timestamp is captured with the entry, so it shows when the entry was made.
  return { ...market, cachedAt: new Date().toISOString() };
}

/** Live APYs: never cached. Callers must render this behind <Suspense>; it becomes a streamed hole in the shell. */
export async function getLiveRates(): Promise<{ rates: LiveRate[]; fetchedAt: string }> {
  const { market } = await gql<{ market: { reserves: LiveRate[] } | null }>(LIVE_RATES, MARKET, { cache: "no-store" });
  return { rates: market?.reserves ?? [], fetchedAt: new Date().toISOString() };
}

/** One reserve by symbol. Cached per symbol (the argument is part of the cache key); shares the 'markets' tag. */
export async function getReserveBySymbol(symbol: string): Promise<(ReserveDetail & { cachedAt: string }) | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag(MARKETS_TAG, `reserve:${symbol.toLowerCase()}`);
  const overview = await getMarketOverview();
  const row = overview.reserves.find((r) => r.underlyingToken.symbol.toLowerCase() === symbol.toLowerCase());
  if (!row) return null;
  const { reserve } = await gql<{ reserve: ReserveDetail | null }>(RESERVE_DETAIL, {
    market: MARKET.address,
    chainId: MARKET.chainId,
    underlyingToken: row.underlyingToken.address,
  });
  return reserve ? { ...reserve, cachedAt: new Date().toISOString() } : null;
}

export type ApyWindow = "LAST_DAY" | "LAST_WEEK" | "LAST_MONTH";

/** Hourly APY history for the chart: uncached, streamed to a Client Component through a promise. */
export async function getApyHistory(underlyingToken: Address, window: ApyWindow): Promise<{ supply: ApySample[]; borrow: ApySample[] }> {
  const data = await gql<{ supplyAPYHistory: ApySample[]; borrowAPYHistory: ApySample[] }>(
    APY_HISTORY,
    { market: MARKET.address, chainId: MARKET.chainId, underlyingToken, window },
    { cache: "no-store" },
  );
  return { supply: data.supplyAPYHistory, borrow: data.borrowAPYHistory };
}

export type UserPositions = {
  state: UserMarketState;
  supplies: UserSupply[];
  borrows: UserBorrow[];
  /** Liquidation threshold per underlying token address, joined from the market overview. */
  thresholds: Record<string, string>;
  cachedAt: string;
};

/** Wallet positions: cached per address for a minute. Positions change rarely; a stale minute is fine, a stale hour is not. */
export async function getUserPositions(address: Address): Promise<UserPositions> {
  "use cache";
  cacheLife("minutes");
  cacheTag(walletTag(address));
  const [data, overview] = await Promise.all([
    gql<{ userMarketState: UserMarketState; userSupplies: UserSupply[]; userBorrows: UserBorrow[] }>(USER_POSITIONS, {
      market: MARKET.address,
      chainId: MARKET.chainId,
      user: address,
    }),
    getMarketOverview(),
  ]);
  const thresholds: Record<string, string> = {};
  for (const r of overview.reserves) thresholds[r.underlyingToken.address.toLowerCase()] = r.supplyInfo.liquidationThreshold.value;
  return { state: data.userMarketState, supplies: data.userSupplies, borrows: data.userBorrows, thresholds, cachedAt: new Date().toISOString() };
}

/**
 * On-chain account data: uncached, but deduped per request with React.cache so two components on
 * the same page (the health card and the block footer) share one RPC call. `preloadAccount` lets
 * the page start the call before the component that awaits it renders (no waterfall).
 */
export const getOnChainAccount = cache(async (address: Address): Promise<OnChainAccountData> => readUserAccountData(address));
export const preloadAccount = (address: Address) => {
  void getOnChainAccount(address);
};
