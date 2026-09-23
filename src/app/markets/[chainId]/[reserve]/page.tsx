import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getApyHistory, getReserveBySymbol, MARKET } from "@/lib/aave/data";
import { fmtNum, fmtPct, fmtUsd } from "@/lib/format";
import { settle } from "@/lib/settle";
import { ApyChart } from "@/components/ApyChart";
import { Card, Mode, Skeleton, Stat } from "@/components/ui";

/**
 * Reserve detail: /markets/1/WETH
 *
 * generateStaticParams prerenders three reserves at build time. Any other symbol is rendered on
 * the first request and then kept (ISR under Cache Components); an unknown symbol is a 404.
 * `params` is a Promise: we await it inside the Suspense'd child so the shell stays static.
 */
export async function generateStaticParams() {
  return ["WETH", "USDC", "wstETH"].map((reserve) => ({ chainId: String(MARKET.chainId), reserve }));
}

export async function generateMetadata(props: PageProps<"/markets/[chainId]/[reserve]">): Promise<Metadata> {
  const { reserve } = await props.params;
  return { title: `${decodeURIComponent(reserve)} reserve` };
}

export default function ReservePage(props: PageProps<"/markets/[chainId]/[reserve]">) {
  return (
    <Suspense fallback={<Skeleton rows={6} />}>
      <Reserve params={props.params} />
    </Suspense>
  );
}

async function Reserve({ params }: Pick<PageProps<"/markets/[chainId]/[reserve]">, "params">) {
  const { chainId, reserve: symbol } = await params;
  if (Number(chainId) !== MARKET.chainId) notFound();
  const reserve = await getReserveBySymbol(decodeURIComponent(symbol));
  if (!reserve) notFound();

  // Not awaited: the promise crosses to the Client Component, which suspends on it. Settled here so
  // it never rejects: a rejected promise read with use() would throw to the nearest error boundary.
  const history = settle(getApyHistory(reserve.underlyingToken.address, "LAST_WEEK"), "Aave API error");
  const t = reserve.underlyingToken;
  const b = reserve.borrowInfo;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-muted">
          <Link href="/" className="hover:text-accent">Markets</Link> / {reserve.market.name}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t.symbol} <span className="text-base font-normal text-muted">{t.name}</span>
        </h1>
      </div>

      <Card title="Reserve parameters" aside={<Mode kind="cached" at={reserve.cachedAt} />}>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Total supplied" value={fmtUsd(reserve.size.usd)} hint={`${fmtNum(reserve.size.amount.value)} ${t.symbol}`} />
          <Stat label="Supply cap" value={`${fmtNum(reserve.supplyInfo.supplyCap.amount.value)} ${t.symbol}`} />
          <Stat label="Supply APY" value={fmtPct(reserve.supplyInfo.apy.value)} />
          <Stat label="Borrow APY" value={b ? fmtPct(b.apy.value) : "–"} hint={b ? `utilisation ${fmtPct(b.utilizationRate.value)} · optimal ${fmtPct(b.optimalUsageRate.value, 0)}` : "not borrowable"} />
          <Stat label="Max LTV" value={fmtPct(reserve.supplyInfo.maxLTV.value, 0)} />
          <Stat label="Liquidation threshold" value={fmtPct(reserve.supplyInfo.liquidationThreshold.value, 0)} />
          <Stat label="Liquidation bonus" value={fmtPct(reserve.supplyInfo.liquidationBonus.value, 0)} />
          <Stat label="Reserve factor" value={b ? fmtPct(b.reserveFactor.value, 0) : "–"} hint={b ? `available ${fmtUsd(b.availableLiquidity.usd)}` : undefined} />
        </div>
        <dl className="mt-3 grid grid-cols-1 gap-1 font-mono text-xs text-muted md:grid-cols-3">
          <div>underlying {t.address}</div>
          <div>{reserve.aToken.symbol} {reserve.aToken.address}</div>
          <div>{reserve.vToken.symbol} {reserve.vToken.address}</div>
        </dl>
      </Card>

      <Card title="APY, last 7 days (hourly)" aside={<Mode kind="live" />}>
        <Suspense fallback={<Skeleton rows={4} />}>
          <ApyChart dataPromise={history} />
        </Suspense>
      </Card>
    </div>
  );
}
