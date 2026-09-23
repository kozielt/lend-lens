import { describe, expect, it } from "vitest";
import { computeHealthFactor, formatHealthFactor, healthFactorBand } from "../health";
import { parseDecimal } from "../decimal";

const weth = (usd: string, isCollateral = true) => ({ symbol: "WETH", usd, liquidationThreshold: "0.83", isCollateral });
const usdc = (usd: string, isCollateral = true) => ({ symbol: "USDC", usd, liquidationThreshold: "0.78", isCollateral });

describe("computeHealthFactor", () => {
  it("is infinite with no debt", () => {
    const hf = computeHealthFactor([weth("1000")], []);
    expect(hf.kind).toBe("infinite");
    expect(formatHealthFactor(hf)).toBe("∞");
    expect(healthFactorBand(hf)).toBe("safe");
  });

  it("matches the textbook example: 1000 WETH at 83 % vs 415 debt → 2.00", () => {
    const hf = computeHealthFactor([weth("1000")], [{ symbol: "USDC", usd: "415" }]);
    expect(hf.kind).toBe("value");
    expect(formatHealthFactor(hf)).toBe("2.00");
    expect(healthFactorBand(hf)).toBe("warning");
  });

  it("weights each collateral by its own liquidation threshold", () => {
    // 1000 × 0.83 + 500 × 0.78 = 830 + 390 = 1220 ; 1220 / 1000 = 1.22
    const hf = computeHealthFactor([weth("1000"), usdc("500")], [{ symbol: "DAI", usd: "1000" }]);
    expect(formatHealthFactor(hf)).toBe("1.22");
    expect(healthFactorBand(hf)).toBe("warning");
  });

  it("ignores supplies that are not enabled as collateral", () => {
    const hf = computeHealthFactor([weth("1000"), usdc("500", false)], [{ symbol: "DAI", usd: "1000" }]);
    expect(formatHealthFactor(hf)).toBe("0.83");
    expect(healthFactorBand(hf)).toBe("liquidatable");
    if (hf.kind === "value") {
      expect(hf.totalCollateralUsd).toBe(parseDecimal("1000"));
      expect(hf.totalDebtUsd).toBe(parseDecimal("1000"));
    }
  });

  it("sums several debts", () => {
    const hf = computeHealthFactor([weth("1000")], [{ symbol: "DAI", usd: "400" }, { symbol: "USDC", usd: "400" }]);
    expect(formatHealthFactor(hf)).toBe("1.03");
    expect(healthFactorBand(hf)).toBe("danger");
  });

  it("survives the API's 27-digit decimals without float drift", () => {
    const hf = computeHealthFactor(
      [{ symbol: "wstETH", usd: "2384321604.49784282015659123456789", liquidationThreshold: "0.81", isCollateral: true }],
      [{ symbol: "USDC", usd: "1000000000.123456789012345678901234567" }],
    );
    expect(formatHealthFactor(hf)).toBe("1.93");
  });

  it("debt with zero collateral is liquidatable at 0.00", () => {
    const hf = computeHealthFactor([], [{ symbol: "USDC", usd: "10" }]);
    expect(formatHealthFactor(hf)).toBe("0.00");
    expect(healthFactorBand(hf)).toBe("liquidatable");
  });
});
