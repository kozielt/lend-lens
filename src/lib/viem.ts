import "server-only";
import { createPublicClient, http, isAddress, parseAbi, type Address } from "viem";
import { mainnet } from "viem/chains";
import { AaveV3Ethereum } from "@bgd-labs/aave-address-book";

/**
 * The one direct chain read in the app: `Pool.getUserAccountData(user)`.
 *
 * It returns the health factor the protocol itself would use to liquidate, so the
 * wallet page can show "our number" (computed from API positions in health.ts)
 * next to "the chain's number" and they should agree.
 *
 * RPC_URL is server-only (no NEXT_PUBLIC_ prefix) and defaults to a keyless public node.
 */

export const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(process.env.RPC_URL ?? "https://ethereum.publicnode.com", { timeout: 10_000 }),
});

export const POOL: Address = AaveV3Ethereum.POOL;

/** Only the one view we call; the full IPool ABI is 100+ entries we do not need in the bundle. */
const POOL_ABI = parseAbi([
  "function getUserAccountData(address user) view returns (uint256 totalCollateralBase, uint256 totalDebtBase, uint256 availableBorrowsBase, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor)",
]);

export type OnChainAccountData = {
  /** Base currency on Ethereum is USD with 8 decimals. */
  totalCollateralBase: bigint;
  totalDebtBase: bigint;
  availableBorrowsBase: bigint;
  /** In basis points, e.g. 8250n = 82.5 %. */
  currentLiquidationThreshold: bigint;
  ltv: bigint;
  /** Scaled 1e18; uint256 max when there is no debt. */
  healthFactor: bigint;
  blockNumber: bigint;
};

export async function readUserAccountData(user: Address): Promise<OnChainAccountData> {
  if (!isAddress(user)) throw new Error(`Not an EVM address: ${user}`);
  const [blockNumber, data] = await Promise.all([
    publicClient.getBlockNumber(),
    publicClient.readContract({ address: POOL, abi: POOL_ABI, functionName: "getUserAccountData", args: [user] }),
  ]);
  const [totalCollateralBase, totalDebtBase, availableBorrowsBase, currentLiquidationThreshold, ltv, healthFactor] = data;
  return { totalCollateralBase, totalDebtBase, availableBorrowsBase, currentLiquidationThreshold, ltv, healthFactor, blockNumber };
}
