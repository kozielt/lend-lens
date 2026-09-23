import { describe, expect, it } from "vitest";
import { divScaled, formatDecimal, mulScaled, parseDecimal } from "../decimal";

describe("parseDecimal", () => {
  it("parses integers and fractions at scale 18", () => {
    expect(parseDecimal("1")).toBe(10n ** 18n);
    expect(parseDecimal("0.5")).toBe(5n * 10n ** 17n);
    expect(parseDecimal("123.456", 3)).toBe(123456n);
  });
  it("truncates digits beyond the scale instead of rounding", () => {
    expect(parseDecimal("0.031388236239957114763024843", 18)).toBe(31388236239957114n);
    expect(parseDecimal("1.999", 2)).toBe(199n);
  });
  it("handles negative and edge inputs", () => {
    expect(parseDecimal("-2.5", 1)).toBe(-25n);
    expect(parseDecimal("0")).toBe(0n);
    expect(parseDecimal(".5", 1)).toBe(5n);
    expect(parseDecimal("5.", 1)).toBe(50n);
  });
  it("rejects garbage", () => {
    expect(() => parseDecimal("1e5")).toThrow();
    expect(() => parseDecimal("")).toThrow();
    expect(() => parseDecimal("abc")).toThrow();
  });
});

describe("formatDecimal", () => {
  it("formats with the requested number of digits", () => {
    expect(formatDecimal(parseDecimal("1234.5678"), 18, 2)).toBe("1234.56");
    expect(formatDecimal(parseDecimal("0.04"), 18, 2)).toBe("0.04");
    expect(formatDecimal(parseDecimal("7"), 18, 0)).toBe("7");
    expect(formatDecimal(parseDecimal("-0.5"), 18, 1)).toBe("-0.5");
  });
});

describe("mulScaled / divScaled", () => {
  it("multiplies and divides fixed-point numbers exactly", () => {
    expect(mulScaled(parseDecimal("100"), parseDecimal("0.83"))).toBe(parseDecimal("83"));
    expect(divScaled(parseDecimal("83"), parseDecimal("41.5"))).toBe(parseDecimal("2"));
  });
  it("throws on division by zero", () => {
    expect(() => divScaled(1n, 0n)).toThrow(RangeError);
  });
});
