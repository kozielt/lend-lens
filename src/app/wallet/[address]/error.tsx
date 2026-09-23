"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Error boundary for the wallet segment, for UNEXPECTED failures only (Aave API down, a bug).
 * A bad address is not an error here: the page renders <InvalidAddress/> for it.
 *
 * In production a Server Component error reaches this file redacted: a generic message plus a
 * `digest` that matches the server log line. So the message is ours and the digest is shown.
 * `retry` re-fetches and re-renders the segment; `reset` would only re-render (useless for a
 * server-side failure), so it is not offered.
 */
export default function WalletError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="rounded-lg border border-red-500/40 bg-red-500/5 p-4">
      <h1 className="font-semibold">Could not load this wallet</h1>
      <p className="mt-1 text-sm text-muted">Something went wrong on our side or upstream. Trying again usually helps.</p>
      {error.digest ? <p className="mt-1 font-mono text-xs text-muted">digest {error.digest}</p> : null}
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={() => retry()} className="rounded-md border border-border px-3 py-1.5 text-xs font-medium">Retry</button>
        <Link href="/wallet" className="rounded-md border border-border px-3 py-1.5 text-xs font-medium">Pick another address</Link>
      </div>
    </div>
  );
}
