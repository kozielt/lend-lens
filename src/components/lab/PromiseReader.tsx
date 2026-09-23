"use client";

import { use } from "react";

/** Suspends until the server's promise resolves; the value streams in later. */
export function PromiseReader({ promise }: { promise: Promise<string> }) {
  return <p className="font-mono text-xs">{use(promise)}</p>;
}
