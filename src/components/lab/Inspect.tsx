"use client";

/** Reports what a prop looks like after it crossed into the client. */
export function Inspect({ value }: { value: unknown }) {
  const proto = value !== null && typeof value === "object" ? Object.getPrototypeOf(value)?.constructor?.name : "–";
  return (
    <code className="font-mono text-xs">
      typeof {typeof value} · prototype {proto} · {String(value)}
    </code>
  );
}
