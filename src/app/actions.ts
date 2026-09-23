"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { isAddress } from "viem";
import { MARKETS_TAG, walletTag } from "@/lib/aave/data";

/**
 * Server Functions. `updateTag` (not `revalidateTag`) because the user just clicked "refresh"
 * and expects to see fresh data in the same response: it expires the tag immediately and the
 * action's response carries the re-rendered page. `revalidateTag(tag, 'max')` would instead
 * serve the stale entry once more and refresh in the background (stale-while-revalidate),
 * which is what /api/revalidate does for webhook-style callers.
 */
export async function refreshMarkets(): Promise<{ refreshedAt: string }> {
  updateTag(MARKETS_TAG);
  return { refreshedAt: new Date().toISOString() };
}

export async function refreshWallet(address: string): Promise<void> {
  if (!isAddress(address)) return;
  updateTag(walletTag(address));
}

/** Progressive enhancement: the wallet form posts here and works with JavaScript disabled. */
export async function lookupWallet(formData: FormData): Promise<void> {
  const raw = String(formData.get("address") ?? "").trim();
  redirect(`/wallet/${encodeURIComponent(raw)}`);
}
