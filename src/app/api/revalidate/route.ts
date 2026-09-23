import { revalidateTag } from "next/cache";
import { MARKETS_TAG } from "@/lib/aave/data";

/**
 * POST /api/revalidate — the webhook-style invalidation.
 *
 * `revalidateTag(tag, 'max')` marks the tag stale: the next reader still gets the old entry
 * once and a refresh runs in the background (stale-while-revalidate). Compare the Refresh
 * button, whose Server Function calls `updateTag` for read-your-own-writes. The second
 * argument is required in Next 16.
 *
 * If REVALIDATE_SECRET is set, the caller must send it as a bearer token.
 */
export async function POST(request: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  revalidateTag(MARKETS_TAG, "max");
  return Response.json({ revalidated: MARKETS_TAG, at: new Date().toISOString() });
}
