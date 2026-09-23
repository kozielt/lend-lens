/** Shapes we select from the Aave V3 GraphQL API (https://api.v3.aave.com/graphql). */

export type Percent = { value: string; formatted: string };

export type Token = {
  address: `0x${string}`;
  symbol: string;
  name: string;
  decimals: number;
  imageUrl: string;
};

export type ReserveRow = {
  underlyingToken: Token;
  size: { usd: string };
  usdExchangeRate: string;
  supplyInfo: {
    apy: Percent;
    maxLTV: Percent;
    liquidationThreshold: Percent;
    canBeCollateral: boolean;
  };
  borrowInfo: {
    apy: Percent;
    utilizationRate: Percent;
    total: { usd: string };
  } | null;
  isFrozen: boolean;
  isPaused: boolean;
};

export type MarketOverview = {
  name: string;
  address: `0x${string}`;
  icon: string;
  totalMarketSize: string;
  totalAvailableLiquidity: string;
  chain: { name: string; chainId: number; explorerUrl: string };
  reserves: ReserveRow[];
};

export type LiveRate = {
  underlyingToken: Pick<Token, "address" | "symbol">;
  supplyInfo: { apy: Percent };
  borrowInfo: { apy: Percent; utilizationRate: Percent } | null;
};

export type ReserveDetail = ReserveRow & {
  market: { name: string; address: `0x${string}` };
  aToken: Pick<Token, "address" | "symbol">;
  vToken: Pick<Token, "address" | "symbol">;
  size: { usd: string; amount: { value: string } };
  supplyInfo: ReserveRow["supplyInfo"] & {
    supplyCap: { amount: { value: string } };
    total: { value: string };
    liquidationBonus: Percent;
  };
  borrowInfo: (NonNullable<ReserveRow["borrowInfo"]> & {
    optimalUsageRate: Percent;
    availableLiquidity: { usd: string };
    reserveFactor: Percent;
    borrowCap: { amount: { value: string } };
  }) | null;
};

export type ApySample = { date: string; avgRate: Percent };

export type UserSupply = {
  currency: Token;
  balance: { usd: string; amount: { value: string }; usdPerToken: string };
  apy: Percent;
  isCollateral: boolean;
  canBeCollateral: boolean;
};

export type UserBorrow = {
  currency: Token;
  debt: { usd: string; amount: { value: string } };
  apy: Percent;
};

export type UserMarketState = {
  netWorth: string;
  healthFactor: string | null;
  totalCollateralBase: string;
  totalDebtBase: string;
  currentLiquidationThreshold: Percent;
  ltv: Percent;
  eModeEnabled: boolean;
};
