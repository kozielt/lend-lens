/** Display formatting. Inputs are the API's decimal strings; we only go through Number at the last step, for display. */

const usdCompact = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 2 });
const usdFull = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
const num = new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 });

export function fmtUsd(value: string | number, compact = true): string {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return "–";
  return (compact && Math.abs(n) >= 10_000 ? usdCompact : usdFull).format(n);
}

/** The API's PercentValue.value is a fraction ("0.0377" = 3.77 %). */
export function fmtPct(fraction: string | number, digits = 2): string {
  const n = typeof fraction === "number" ? fraction : Number(fraction);
  if (!Number.isFinite(n)) return "–";
  return `${(n * 100).toFixed(digits)}%`;
}

export function fmtNum(value: string | number): string {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? num.format(n) : "–";
}

export function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
