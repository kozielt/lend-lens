"use client";

import Link from "next/link";

/**
 * Error boundary for the wallet segment. Must be a Client Component (it holds the retry
 * callback). `retry` re-fetches and re-renders the segment; `reset` only re-renders.
 */
export default function WalletError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div className="rounded-lg border border-red-500/40 bg-red-500/5 p-4">
      <h1 className="font-semibold">Could not load this wallet</h1>
      <p className="mt-1 text-sm text-muted">{error.message}</p>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={retry} className="rounded-md border border-border px-3 py-1.5 text-xs font-medium">Retry</button>
        <Link href="/wallet" className="rounded-md border border-border px-3 py-1.5 text-xs font-medium">Pick another address</Link>
      </div>
    </div>
  );
}
