import { divScaled, mulScaled, parseDecimal, WAD } from "./decimal";

/**
 * Aave health factor, computed from a user's positions in our own code.
 *
 *   HF = Σ_i (collateral_i in USD × liquidationThreshold_i)  /  Σ_j (debt_j in USD)
 *
 * Below 1.0 the position can be liquidated. Only supplies flagged `isCollateral`
 * count in the numerator; every borrow counts in the denominator. With no debt
 * the health factor is infinite (Aave's UI shows "∞"; the API returns null).
 *
 * Caveat: when the user has an E-Mode category enabled, Aave applies the
 * category's liquidation threshold to the assets in that category instead of
 * each reserve's own threshold. This function takes whatever thresholds the
 * caller passes, so pass the effective ones.
 */

export type CollateralPosition = {
  symbol: string;
  /** USD value of the supplied balance, as a decimal string from the API. */
  usd: string;
  /** Liquidation threshold as a fraction, e.g. "0.83" for 83 %. */
  liquidationThreshold: string;
  isCollateral: boolean;
};

export type DebtPosition = {
  symbol: string;
  /** USD value of the outstanding debt, as a decimal string from the API. */
  usd: string;
};

export type HealthFactor =
  | { kind: "infinite"; totalCollateralUsd: bigint; totalDebtUsd: 0n }
  | { kind: "value"; value: bigint; totalCollateralUsd: bigint; totalDebtUsd: bigint };

export function computeHealthFactor(
  supplies: readonly CollateralPosition[],
  borrows: readonly DebtPosition[],
): HealthFactor {
  let weightedCollateral = 0n; // Σ collateral × threshold, scaled 1e18
  let totalCollateralUsd = 0n;
  for (const s of supplies) {
    if (!s.isCollateral) continue;
    const usd = parseDecimal(s.usd);
    totalCollateralUsd += usd;
    weightedCollateral += mulScaled(usd, parseDecimal(s.liquidationThreshold));
  }

  let totalDebtUsd = 0n;
  for (const b of borrows) totalDebtUsd += parseDecimal(b.usd);

  if (totalDebtUsd === 0n) return { kind: "infinite", totalCollateralUsd, totalDebtUsd: 0n };
  return {
    kind: "value",
    value: divScaled(weightedCollateral, totalDebtUsd),
    totalCollateralUsd,
    totalDebtUsd,
  };
}

/** Render a health factor the way Aave's UI does: "∞", or a number with 2 decimals. */
export function formatHealthFactor(hf: HealthFactor): string {
  if (hf.kind === "infinite") return "∞";
  const base = 10n ** BigInt(WAD);
  const int = hf.value / base;
  const frac = ((hf.value % base) * 100n) / base;
  return `${int}.${frac.toString().padStart(2, "0")}`;
}

/** Aave's colour bands: < 1 liquidatable, < 1.1 danger, < 3 warning, else healthy. */
export function healthFactorBand(hf: HealthFactor): "safe" | "warning" | "danger" | "liquidatable" {
  if (hf.kind === "infinite") return "safe";
  const one = 10n ** BigInt(WAD);
  if (hf.value < one) return "liquidatable";
  if (hf.value < (one * 11n) / 10n) return "danger";
  if (hf.value < one * 3n) return "warning";
  return "safe";
}
