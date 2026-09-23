import { unstable_rethrow } from "next/navigation";

/**
 * Turn a promise that may reject into one that resolves to a value, so a streamed block can
 * render its own failure instead of throwing to the nearest error boundary.
 *
 * - `reason` is ours, not the error's message: it reaches the browser, the real error only goes
 *   to the server log (same idea as production error redaction).
 * - `unstable_rethrow` first: `notFound()`, `redirect()` and prerender bail-outs are thrown
 *   signals, not failures, and must keep propagating.
 */
export type Settled<T> = { ok: true; value: T } | { ok: false; reason: string };

export function settle<T>(promise: Promise<T>, reason: string): Promise<Settled<T>> {
  return promise.then(
    (value) => ({ ok: true, value }),
    (err: unknown) => {
      unstable_rethrow(err);
      console.error(`[settle] ${reason}:`, err);
      return { ok: false, reason };
    },
  );
}
