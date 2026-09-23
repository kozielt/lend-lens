"use client";

import Link from "next/link";

/** Shared body of the drill's error.tsx files. */
export function LabError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div className="space-y-3 rounded-lg border border-red-500/40 bg-card p-4">
      <h1 className="text-lg font-semibold">The error boundary caught it</h1>
      <p className="font-mono text-xs text-red-500">{error.message}</p>
      {error.digest ? <p className="font-mono text-xs text-muted">digest: {error.digest}</p> : null}
      <div className="flex gap-3 text-sm">
        <button type="button" onClick={() => retry()} className="rounded-md border border-border px-3 py-1 text-xs hover:border-accent">
          Retry (fails again, on purpose)
        </button>
        <Link href="/lab/boundary" className="text-accent hover:underline">← back to the boundary drill</Link>
      </div>
    </div>
  );
}
