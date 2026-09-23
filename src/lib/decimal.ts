/**
 * Exact decimal maths on `bigint`, no floats.
 *
 * The Aave API returns every number as a decimal string (BigDecimal), often with
 * 27 fractional digits. We parse those into fixed-point bigints at a chosen
 * scale so sums and ratios stay exact until the very last formatting step.
 */

export const WAD = 18; // default scale: 18 fractional digits, like Aave's "ray/wad" maths

/** Parse "123.456" into a bigint scaled by 10^scale. Extra digits are truncated, never rounded. */
export function parseDecimal(value: string, scale = WAD): bigint {
  const s = value.trim();
  if (!/^-?\d*(\.\d*)?$/.test(s) || s === "" || s === "-" || s === ".") {
    throw new Error(`parseDecimal: not a decimal string: "${value}"`);
  }
  const negative = s.startsWith("-");
  const [intPart = "", fracPart = ""] = (negative ? s.slice(1) : s).split(".");
  const frac = (fracPart + "0".repeat(scale)).slice(0, scale);
  const n = BigInt((intPart || "0") + frac);
  return negative ? -n : n;
}

/** Format a scaled bigint back to a decimal string with `digits` fractional digits (truncated). */
export function formatDecimal(value: bigint, scale = WAD, digits = 2): string {
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const base = 10n ** BigInt(scale);
  const intPart = abs / base;
  const fracPart = (abs % base).toString().padStart(scale, "0").slice(0, digits);
  const out = digits > 0 ? `${intPart}.${fracPart}` : `${intPart}`;
  return negative ? `-${out}` : out;
}

/** (a * b) / 10^scale — multiply two fixed-point numbers of the same scale. */
export function mulScaled(a: bigint, b: bigint, scale = WAD): bigint {
  return (a * b) / 10n ** BigInt(scale);
}

/** (a * 10^scale) / b — divide two fixed-point numbers of the same scale. Throws on b = 0. */
export function divScaled(a: bigint, b: bigint, scale = WAD): bigint {
  if (b === 0n) throw new RangeError("divScaled: division by zero");
  return (a * 10n ** BigInt(scale)) / b;
}
