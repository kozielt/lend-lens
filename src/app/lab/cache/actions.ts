"use server";

import { revalidateTag, updateTag } from "next/cache";
import { cookies } from "next/headers";
import { LAB_TAG, THEME_COOKIE } from "@/lib/lab/cache";

/** Read-your-own-writes: the tag expires now and this action's response re-renders with fresh entries. */
export async function refreshLab(): Promise<void> {
  updateTag(LAB_TAG);
}

/** Stale-while-revalidate: marks the tag stale; the next read still gets the old entry and refreshes in the background. */
export async function revalidateLabSwr(): Promise<void> {
  revalidateTag(LAB_TAG, "max");
}

/** Cookies can only be set in a Server Function or Route Handler (headers are gone once rendering streams). */
export async function toggleLabTheme(): Promise<void> {
  const jar = await cookies();
  const next = jar.get(THEME_COOKIE)?.value === "dark" ? "light" : "dark";
  jar.set(THEME_COOKIE, next, { httpOnly: true, sameSite: "lax", path: "/lab" });
}
