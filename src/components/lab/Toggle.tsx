"use client";

import { useState, type ReactNode } from "react";

/** Client state around a slot. `children` is already-rendered server output. */
export function Toggle({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="space-y-2">
      <button type="button" onClick={() => setOpen((o) => !o)} className="rounded-md border border-border px-2 py-1 text-xs hover:border-accent">
        {open ? "Hide" : "Show"} the server subtree
      </button>
      {open ? children : null}
    </div>
  );
}
