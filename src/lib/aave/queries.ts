/** GraphQL documents. Kept as plain strings: no codegen, no client library, the fetch is the API. */

const PERCENT = `{ value formatted }`;
const TOKEN = `{ address symbol name decimals imageUrl }`;

const RESERVE_ROW = `
  underlyingToken ${TOKEN}
  size { usd }
  usdExchangeRate
  supplyInfo { apy ${PERCENT} maxLTV ${PERCENT} liquidationThreshold ${PERCENT} canBeCollateral }
  borrowInfo { apy ${PERCENT} utilizationRate ${PERCENT} total { usd } }
  isFrozen
  isPaused
`;

export const MARKET_OVERVIEW = `
  query MarketOverview($address: EvmAddress!, $chainId: ChainId!) {
    market(request: { address: $address, chainId: $chainId }) {
      name address icon totalMarketSize totalAvailableLiquidity
      chain { name chainId explorerUrl }
      reserves(request: { reserveType: BOTH, orderBy: { tokenName: ASC } }) { ${RESERVE_ROW} }
    }
  }
`;

export const LIVE_RATES = `
  query LiveRates($address: EvmAddress!, $chainId: ChainId!) {
    market(request: { address: $address, chainId: $chainId }) {
      reserves(request: { reserveType: BOTH, orderBy: { tokenName: ASC } }) {
        underlyingToken { address symbol }
        supplyInfo { apy ${PERCENT} }
        borrowInfo { apy ${PERCENT} utilizationRate ${PERCENT} }
      }
    }
  }
`;

export const RESERVE_DETAIL = `
  query ReserveDetail($market: EvmAddress!, $underlyingToken: EvmAddress!, $chainId: ChainId!) {
    reserve(request: { market: $market, underlyingToken: $underlyingToken, chainId: $chainId }) {
      ${RESERVE_ROW}
      market { name address }
      aToken { address symbol }
      vToken { address symbol }
      size { usd amount { value } }
      supplyInfo { supplyCap { amount { value } } total { value } liquidationBonus ${PERCENT} }
      borrowInfo { optimalUsageRate ${PERCENT} availableLiquidity { usd } reserveFactor ${PERCENT} borrowCap { amount { value } } }
    }
  }
`;

export const APY_HISTORY = `
  query ApyHistory($market: EvmAddress!, $underlyingToken: EvmAddress!, $chainId: ChainId!, $window: TimeWindow!) {
    supplyAPYHistory(request: { market: $market, underlyingToken: $underlyingToken, chainId: $chainId, window: $window }) {
      date avgRate ${PERCENT}
    }
    borrowAPYHistory(request: { market: $market, underlyingToken: $underlyingToken, chainId: $chainId, window: $window }) {
      date avgRate ${PERCENT}
    }
  }
`;

export const USER_POSITIONS = `
  query UserPositions($market: EvmAddress!, $chainId: ChainId!, $user: EvmAddress!) {
    userMarketState(request: { market: $market, chainId: $chainId, user: $user }) {
      netWorth healthFactor totalCollateralBase totalDebtBase
      currentLiquidationThreshold ${PERCENT} ltv ${PERCENT} eModeEnabled
    }
    userSupplies(request: { markets: [{ address: $market, chainId: $chainId }], user: $user, collateralsOnly: false, orderBy: { balance: DESC } }) {
      currency ${TOKEN}
      balance { usd amount { value } usdPerToken }
      apy ${PERCENT}
      isCollateral canBeCollateral
    }
    userBorrows(request: { markets: [{ address: $market, chainId: $chainId }], user: $user, orderBy: { debt: DESC } }) {
      currency ${TOKEN}
      debt { usd amount { value } }
      apy ${PERCENT}
    }
  }
`;
