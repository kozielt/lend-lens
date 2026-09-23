"use client";

import { useState, useTransition } from "react";

/** Calls a Server Function received as a prop and shows what it returned. */
export function ServerFnButton({ action }: { action: (clicks: number) => Promise<string> }) {
  const [pending, startTransition] = useTransition();
  const [clicks, setClicks] = useState(0);
  const [reply, setReply] = useState<string | null>(null);
  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const n = clicks + 1;
            setClicks(n);
            setReply(await action(n));
          })
        }
        className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium hover:border-accent disabled:opacity-50"
      >
        {pending ? "Calling…" : "Call the Server Function"}
      </button>
      <p className="font-mono text-xs text-muted">{reply ?? "no call yet"}</p>
    </div>
  );
}
