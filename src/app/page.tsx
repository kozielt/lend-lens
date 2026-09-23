import { Suspense } from "react";
import Link from "next/link";
import { refreshMarkets } from "./actions";
import { getLiveRates, getMarketOverview } from "@/lib/aave/data";
import { fmtPct, fmtUsd } from "@/lib/format";
import { RefreshButton } from "@/components/RefreshButton";
import { settle } from "@/lib/settle";
import { Card, Failed, Mode, Skeleton, Stat } from "@/components/ui";

/**
 * Markets overview. Two halves of one page, deliberately in different caching modes:
 *
 *  <MarketTable/>  reads a 'use cache' function → part of the prerendered shell, served from cache,
 *                  invalidated by the Refresh button (updateTag) or after a minute (cacheLife).
 *  <LiveRates/>    awaits an uncached fetch → excluded from the shell, streamed in behind Suspense.
 *
 * Load the page with `curl -N` and you see the shell first (with the skeleton), then the chunk.
 * Each block catches its own upstream failure and renders an inline line (see settle.ts).
 */
export default function MarketsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Aave V3 · Ethereum core market</h1>
        <p className="text-sm text-muted">
          Each block says how it was produced: <Mode kind="static" /> is in the prerendered shell, <Mode kind="cached" /> comes from{" "}
          <code>&apos;use cache&apos;</code>, <Mode kind="live" /> is fetched on every request and streamed in.
        </p>
      </div>
      <Suspense fallback={<Card title="Live rates"><Skeleton rows={2} /></Card>}>
        <LiveRates />
      </Suspense>
      <Suspense fallback={<Card title="Reserves"><Skeleton rows={8} /></Card>}>
        <MarketTable />
      </Suspense>
    </div>
  );
}

const HEADLINE = ["WETH", "wstETH", "WBTC", "USDC", "USDT", "GHO"];

async function LiveRates() {
  const result = await settle(getLiveRates(), "Aave API error");
  if (!result.ok) {
    return (
      <Card title="Live rates" aside={<Mode kind="live" />}>
        <Failed what="could not load live rates" reason={result.reason} />
      </Card>
    );
  }
  const { rates, fetchedAt } = result.value;
  const rows = HEADLINE.map((s) => rates.find((r) => r.underlyingToken.symbol === s)).filter((r) => r !== undefined);
  return (
    <Card title="Live rates" aside={<Mode kind="live" at={fetchedAt} />}>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {rows.map((r) => (
          <Stat
            key={r.underlyingToken.address}
            label={r.underlyingToken.symbol}
            value={<span className="text-green-500">{fmtPct(r.supplyInfo.apy.value)}</span>}
            hint={r.borrowInfo ? <>borrow {fmtPct(r.borrowInfo.apy.value)} · util {fmtPct(r.borrowInfo.utilizationRate.value, 0)}</> : "not borrowable"}
          />
        ))}
      </div>
    </Card>
  );
}

async function MarketTable() {
  const result = await settle(getMarketOverview(), "Aave API error");
  if (!result.ok) {
    return (
      <Card title="Reserves" aside={<span className="flex items-center gap-2"><Mode kind="cached" /><RefreshButton action={refreshMarkets} label="Refresh (updateTag)" /></span>}>
        <Failed what="could not load the reserve list" reason={result.reason} />
      </Card>
    );
  }
  const market = result.value;
  const reserves = market.reserves.filter((r) => !r.isPaused).sort((a, b) => Number(b.size.usd) - Number(a.size.usd));
  return (
    <Card
      title={
        <>
          Reserves · {market.name} · {fmtUsd(market.totalMarketSize)} supplied
        </>
      }
      aside={
        <span className="flex items-center gap-2">
          <Mode kind="cached" at={market.cachedAt} />
          <RefreshButton action={refreshMarkets} label="Refresh (updateTag)" />
        </span>
      }
    >
      <div className="overflow-x-auto">
        <table className="tabular w-full text-sm">
          <thead className="text-left text-xs text-muted">
            <tr>
              <th className="py-1 pr-3 font-medium">Asset</th>
              <th className="py-1 pr-3 text-right font-medium">Supplied</th>
              <th className="py-1 pr-3 text-right font-medium">Borrowed</th>
              <th className="py-1 pr-3 text-right font-medium">Supply APY*</th>
              <th className="py-1 pr-3 text-right font-medium">Borrow APY*</th>
              <th className="py-1 pr-3 text-right font-medium">Max LTV</th>
              <th className="py-1 pr-3 text-right font-medium">Liq. threshold</th>
              <th className="py-1 font-medium">Flags</th>
            </tr>
          </thead>
          <tbody>
            {reserves.map((r) => (
              <tr key={r.underlyingToken.address} className="border-t border-border">
                <td className="py-1.5 pr-3">
                  <Link href={`/markets/${market.chain.chainId}/${r.underlyingToken.symbol}`} className="font-medium hover:text-accent">
                    {r.underlyingToken.symbol}
                  </Link>
                  <span className="ml-2 text-xs text-muted">{r.underlyingToken.name}</span>
                </td>
                <td className="py-1.5 pr-3 text-right">{fmtUsd(r.size.usd)}</td>
                <td className="py-1.5 pr-3 text-right">{r.borrowInfo ? fmtUsd(r.borrowInfo.total.usd) : "–"}</td>
                <td className="py-1.5 pr-3 text-right">{fmtPct(r.supplyInfo.apy.value)}</td>
                <td className="py-1.5 pr-3 text-right">{r.borrowInfo ? fmtPct(r.borrowInfo.apy.value) : "–"}</td>
                <td className="py-1.5 pr-3 text-right">{fmtPct(r.supplyInfo.maxLTV.value, 0)}</td>
                <td className="py-1.5 pr-3 text-right">{fmtPct(r.supplyInfo.liquidationThreshold.value, 0)}</td>
                <td className="py-1.5 text-xs text-muted">
                  {r.supplyInfo.canBeCollateral ? "collateral " : ""}
                  {r.isFrozen ? "frozen" : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-muted">* APY as of the cache entry above; the panel on top is the live value.</p>
    </Card>
  );
}
