import { Suspense } from "react";
import type { Metadata } from "next";
import { getAddress, isAddress, type Address } from "viem";
import { refreshWallet } from "@/app/actions";
import { getOnChainAccount, getUserPositions, preloadAccount } from "@/lib/aave/data";
import { computeHealthFactor, formatHealthFactor, healthFactorBand, type HealthFactor } from "@/lib/health";
import { fmtNum, fmtPct, fmtUsd, shortAddress } from "@/lib/format";
import { RefreshButton } from "@/components/RefreshButton";
import { Card, Mode, Skeleton, Stat } from "@/components/ui";

/**
 * Wallet page: /wallet/0x…
 *
 * Three data sources, three modes, on one screen:
 *   positions   'use cache' keyed on the address (a minute)     → the tables and our own health factor
 *   chain       uncached viem read, React.cache-deduped         → Aave's own health factor, streamed separately
 *   params      a Promise, awaited inside Suspense              → the shell above stays static
 *
 * A malformed address throws → the sibling error.tsx boundary renders, with a retry button.
 */
export async function generateMetadata(props: PageProps<"/wallet/[address]">): Promise<Metadata> {
  const { address } = await props.params;
  return { title: isAddress(address) ? `Wallet ${shortAddress(address)}` : "Wallet" };
}

export default function WalletPage(props: PageProps<"/wallet/[address]">) {
  return (
    <Suspense fallback={<Skeleton rows={6} />}>
      <Wallet params={props.params} />
    </Suspense>
  );
}

class InvalidAddressError extends Error {
  constructor(input: string) {
    super(`"${input}" is not an EVM address (expected 0x followed by 40 hex characters).`);
    this.name = "InvalidAddressError";
  }
}

async function Wallet({ params }: Pick<PageProps<"/wallet/[address]">, "params">) {
  const { address: raw } = await params;
  const input = decodeURIComponent(raw);
  if (!isAddress(input)) throw new InvalidAddressError(input);
  const address: Address = getAddress(input); // checksummed

  preloadAccount(address); // kick off the RPC call now; <OnChain/> awaits the same promise later
  const positions = await getUserPositions(address);

  const hf = computeHealthFactor(
    positions.supplies.map((s) => ({
      symbol: s.currency.symbol,
      usd: s.balance.usd,
      liquidationThreshold: positions.thresholds[s.currency.address.toLowerCase()] ?? "0",
      isCollateral: s.isCollateral,
    })),
    positions.borrows.map((b) => ({ symbol: b.currency.symbol, usd: b.debt.usd })),
  );
  const refresh = refreshWallet.bind(null, address);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-mono text-xl font-semibold tracking-tight">{address}</h1>
        <p className="text-sm text-muted">Aave V3 Ethereum core market{positions.state.eModeEnabled ? " · E-Mode enabled (thresholds below are the category's)" : ""}</p>
      </div>

      <Card
        title="Health factor"
        aside={
          <span className="flex items-center gap-2">
            <Mode kind="cached" at={positions.cachedAt} />
            <RefreshButton action={refresh} />
          </span>
        }
      >
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Computed here (health.ts)" value={<HealthValue hf={hf} />} hint="Σ collateral × liq. threshold ÷ Σ debt" />
          <Stat label="Aave API says" value={positions.state.healthFactor ? Number(positions.state.healthFactor).toFixed(2) : "∞"} hint="userMarketState.healthFactor" />
          <Stat label="Collateral" value={fmtUsd(positions.state.totalCollateralBase, false)} hint={`weighted threshold ${fmtPct(positions.state.currentLiquidationThreshold.value)}`} />
          <Stat label="Debt" value={fmtUsd(positions.state.totalDebtBase, false)} hint={`net worth ${fmtUsd(positions.state.netWorth, false)}`} />
        </div>
        <div className="mt-3">
          <Suspense fallback={<p className="animate-pulse text-xs text-muted">Reading Pool.getUserAccountData on chain…</p>}>
            <OnChain address={address} />
          </Suspense>
        </div>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card title={`Supplied (${positions.supplies.length})`}>
          <PositionTable
            rows={positions.supplies.map((s) => ({
              key: s.currency.address,
              symbol: s.currency.symbol,
              amount: s.balance.amount.value,
              usd: s.balance.usd,
              apy: s.apy.value,
              note: s.isCollateral ? "collateral" : s.canBeCollateral ? "not enabled" : "no collateral",
            }))}
          />
        </Card>
        <Card title={`Borrowed (${positions.borrows.length})`}>
          <PositionTable
            rows={positions.borrows.map((b) => ({ key: b.currency.address, symbol: b.currency.symbol, amount: b.debt.amount.value, usd: b.debt.usd, apy: b.apy.value, note: "variable" }))}
          />
        </Card>
      </div>
    </div>
  );
}

function HealthValue({ hf }: { hf: HealthFactor }) {
  const band = healthFactorBand(hf);
  const color = { safe: "text-green-500", warning: "text-amber-500", danger: "text-orange-500", liquidatable: "text-red-500" }[band];
  return <span className={color}>{formatHealthFactor(hf)}</span>;
}

async function OnChain({ address }: { address: Address }) {
  const chain = await getOnChainAccount(address);
  const hf = chain.totalDebtBase === 0n ? "∞" : (Number(chain.healthFactor) / 1e18).toFixed(4);
  return (
    <p className="text-xs text-muted">
      <Mode kind="live" /> on chain at block {chain.blockNumber.toString()}: health factor <span className="font-mono text-foreground">{hf}</span>, collateral{" "}
      {fmtUsd(Number(chain.totalCollateralBase) / 1e8, false)}, debt {fmtUsd(Number(chain.totalDebtBase) / 1e8, false)}, liquidation threshold{" "}
      {(Number(chain.currentLiquidationThreshold) / 100).toFixed(2)}%.
    </p>
  );
}

function PositionTable({ rows }: { rows: { key: string; symbol: string; amount: string; usd: string; apy: string; note: string }[] }) {
  if (rows.length === 0) return <p className="text-sm text-muted">Nothing here.</p>;
  return (
    <table className="tabular w-full text-sm">
      <thead className="text-left text-xs text-muted">
        <tr>
          <th className="py-1 pr-3 font-medium">Asset</th>
          <th className="py-1 pr-3 text-right font-medium">Amount</th>
          <th className="py-1 pr-3 text-right font-medium">USD</th>
          <th className="py-1 pr-3 text-right font-medium">APY</th>
          <th className="py-1 font-medium"></th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.key} className="border-t border-border">
            <td className="py-1.5 pr-3 font-medium">{r.symbol}</td>
            <td className="py-1.5 pr-3 text-right">{fmtNum(r.amount)}</td>
            <td className="py-1.5 pr-3 text-right">{fmtUsd(r.usd, false)}</td>
            <td className="py-1.5 pr-3 text-right">{fmtPct(r.apy)}</td>
            <td className="py-1.5 text-xs text-muted">{r.note}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
