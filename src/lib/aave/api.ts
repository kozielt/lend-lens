import "server-only";

/**
 * Thin GraphQL client for the public Aave V3 API. No key, no SDK: one POST per query.
 *
 * `server-only` makes importing this file from a Client Component a build error,
 * so the endpoint, the queries and the response parsing never reach the browser bundle.
 */

export const AAVE_API = "https://api.v3.aave.com/graphql";

/** Aave V3 Ethereum core market ("AaveV3Ethereum" in the address book). */
export const ETHEREUM_CORE_MARKET = {
  chainId: 1,
  address: "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2" as const,
};

export class AaveApiError extends Error {
  constructor(message: string, readonly errors?: unknown) {
    super(message);
    this.name = "AaveApiError";
  }
}

type GraphQLResponse<T> = { data?: T; errors?: { message: string }[] };

export async function gql<T>(query: string, variables: Record<string, unknown>, init?: RequestInit): Promise<T> {
  const res = await fetch(AAVE_API, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query, variables }),
    ...init,
  });
  if (!res.ok) throw new AaveApiError(`Aave API responded ${res.status}`);
  const json = (await res.json()) as GraphQLResponse<T>;
  if (json.errors?.length) throw new AaveApiError(json.errors.map((e) => e.message).join("; "), json.errors);
  if (!json.data) throw new AaveApiError("Aave API returned no data");
  return json.data;
}
