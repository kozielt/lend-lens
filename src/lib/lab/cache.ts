import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { cookies } from "next/headers";

/**
 * Tiny cached functions for the /lab/cache drill. Each returns when it ran and a run number `n`:
 * a cache hit returns the stored entry, so `at` and `n` stay the same; a miss runs the body and
 * bumps `n`. Row per function (same table as src/lib/aave/data.ts):
 *
 *   stamp(label)        'use cache'          key: label              minutes  tag 'lab'
 *   stampClosure(who)   'use cache' inside   key: captured `who`     minutes  tag 'lab'
 *   stampPrivate()      'use cache: private' per request, reads a cookie; never stored on the server
 *   stampShort()        'use cache'          key: none               seconds  tag 'lab' → streamed hole
 */

export const LAB_TAG = "lab";
export const THEME_COOKIE = "lab-theme";
export type Stamp = { label: string; at: string; n: number };

// Module state, not part of any key. Counts real executions in this server process.
let runs = 0;
const run = (label: string): Stamp => ({ label, at: new Date().toISOString(), n: ++runs });

/** The argument is the key: stamp('A') twice is one entry, stamp('B') is another. */
export async function stamp(label: string): Promise<Stamp> {
  "use cache";
  cacheLife("minutes");
  cacheTag(LAB_TAG);
  return run(label);
}

/**
 * The outer function is not cached. The inner one takes no arguments but reads `who` from the
 * enclosing scope; Next binds captured variables as hidden arguments, so `who` is in the key.
 */
export async function stampClosure(who: string): Promise<Stamp> {
  const inner = async () => {
    "use cache";
    cacheLife("minutes");
    cacheTag(LAB_TAG);
    return run(`closure:${who}`);
  };
  return inner();
}

/**
 * Private cache: the only cache scope allowed to read cookies()/headers()/searchParams. Runs at
 * request time, is excluded from the static shell and is not stored across requests on the
 * server (only deduped within one request, and kept by the client router for `stale`).
 */
export async function stampPrivate(): Promise<Stamp & { theme: string }> {
  "use cache: private";
  cacheLife({ stale: 30 });
  const theme = (await cookies()).get(THEME_COOKIE)?.value ?? "light";
  return { ...run("private"), theme };
}

/** `seconds` = stale 30 s, revalidate 1 s, expire 1 min. expire < 5 min → excluded from the prerender. */
export async function stampShort(): Promise<Stamp> {
  "use cache";
  cacheLife("seconds");
  cacheTag(LAB_TAG);
  return run("seconds");
}
