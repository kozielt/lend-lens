"use client";

import { use } from "react";
import type { ApySample } from "@/lib/aave/types";
import type { Settled } from "@/lib/settle";
import { Failed } from "./ui";

type Series = { supply: ApySample[]; borrow: ApySample[] };

/**
 * Client Component that reads a promise created on the server with React's `use()`.
 * The server does not await the history: it hands the promise over, the shell streams,
 * and this component suspends until the data arrives. No useEffect, no loading state of its own.
 *
 * The promise is settled on the server (never rejects), so a failed fetch is a value we render
 * inline, not a throw to an error boundary. See NOTES.md for why not a client error boundary.
 */
export function ApyChart({ dataPromise }: { dataPromise: Promise<Settled<Series>> }) {
  const result = use(dataPromise);
  if (!result.ok) return <Failed what="could not load APY history" reason={result.reason} hint="reload the page to retry" />;
  const { supply, borrow } = result.value;
  const points = [...supply].reverse();
  const bpoints = [...borrow].reverse();
  if (points.length === 0) return <p className="text-sm text-muted">No history for this reserve.</p>;

  const values = [...points, ...bpoints].map((p) => Number(p.avgRate.value) * 100);
  const max = Math.max(...values, 0.01);
  const min = Math.min(...values, 0);
  const W = 640, H = 160, PAD = 8;
  const x = (i: number, n: number) => PAD + (i / Math.max(n - 1, 1)) * (W - 2 * PAD);
  const y = (v: number) => H - PAD - ((v - min) / (max - min || 1)) * (H - 2 * PAD);
  const path = (s: ApySample[]) => s.map((p, i) => `${i === 0 ? "M" : "L"}${x(i, s.length).toFixed(1)},${y(Number(p.avgRate.value) * 100).toFixed(1)}`).join(" ");

  const first = points[0].date.slice(0, 10);
  const last = points[points.length - 1].date.slice(0, 10);
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Supply and borrow APY over time">
        <path d={path(points)} fill="none" stroke="#22c55e" strokeWidth="2" />
        <path d={path(bpoints)} fill="none" stroke="#a78bfa" strokeWidth="2" />
      </svg>
      <figcaption className="mt-1 flex justify-between text-xs text-muted">
        <span>{first} → {last} · {points.length} hourly samples</span>
        <span>
          <span className="text-green-500">■</span> supply APY · <span className="text-accent">■</span> borrow APY · range {min.toFixed(2)}–{max.toFixed(2)}%
        </span>
      </figcaption>
    </figure>
  );
}
