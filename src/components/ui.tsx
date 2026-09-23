import type { ReactNode } from "react";

export function Card({ title, aside, children }: { title: ReactNode; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">{title}</h2>
        {aside ? <div className="text-xs text-muted">{aside}</div> : null}
      </header>
      {children}
    </section>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="rounded-md border border-border p-3">
      <div className="text-xs text-muted">{label}</div>
      <div className="tabular text-lg font-semibold">{value}</div>
      {hint ? <div className="text-xs text-muted">{hint}</div> : null}
    </div>
  );
}

/** A tag that says which caching mode produced the surrounding block. The whole point of the app. */
export function Mode({ kind, at }: { kind: "cached" | "live" | "static"; at?: string }) {
  const colors = { cached: "bg-amber-500/15 text-amber-600 dark:text-amber-400", live: "bg-green-500/15 text-green-600 dark:text-green-400", static: "bg-sky-500/15 text-sky-600 dark:text-sky-400" };
  const text = { cached: "cached", live: "live", static: "static" };
  return (
    <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[11px] ${colors[kind]}`}>
      {text[kind]}
      {at ? <span className="opacity-80">· {new Date(at).toISOString().slice(11, 19)} UTC</span> : null}
    </span>
  );
}

export function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-2" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-5 rounded bg-border" />
      ))}
    </div>
  );
}

/**
 * A lab card: one framework rule, shown as "tried / Next.js said / the fix", with the working
 * pattern rendered live in `children`.
 */
export function Case({ title, tried, said, fix, children }: { title: string; tried: ReactNode; said: ReactNode; fix: ReactNode; children?: ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <h2 className="text-sm font-semibold">{title}</h2>
      <dl className="mt-2 grid gap-2 text-sm md:grid-cols-[7rem_1fr]">
        <dt className="text-xs uppercase tracking-wide text-muted">Tried</dt>
        <dd>{tried}</dd>
        <dt className="text-xs uppercase tracking-wide text-muted">Next.js said</dt>
        <dd className="font-mono text-xs text-red-500">{said}</dd>
        <dt className="text-xs uppercase tracking-wide text-muted">The fix</dt>
        <dd>{fix}</dd>
      </dl>
      {children ? <div className="mt-3 rounded-md border border-dashed border-border p-3 text-sm">{children}</div> : null}
    </section>
  );
}
