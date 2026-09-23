"use client";

import { useState, useTransition } from "react";

/**
 * Client Component: it needs state and an event handler. It receives the Server Function as a
 * prop-like import and calls it inside a transition so React can show a pending state and
 * apply the re-rendered Server Components from the action's response.
 */
export function RefreshButton({ action, label = "Refresh" }: { action: () => Promise<unknown>; label?: string }) {
  const [pending, startTransition] = useTransition();
  const [count, setCount] = useState(0);
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await action();
          setCount((c) => c + 1);
        })
      }
      className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium hover:border-accent disabled:opacity-50"
    >
      {pending ? "Refreshing…" : label}
      {count > 0 && !pending ? ` (×${count})` : ""}
    </button>
  );
}
