"use client";

/** Date, Map and Set arrive as real instances. */
export function BuiltinsView({ date, map, set }: { date: Date; map: Map<string, string>; set: Set<string> }) {
  return (
    <ul className="space-y-1 font-mono text-xs">
      <li>date instanceof Date: {String(date instanceof Date)} · {date.toISOString()}</li>
      <li>
        toLocaleString(), suppressHydrationWarning: <time suppressHydrationWarning>{date.toLocaleString()}</time>
      </li>
      <li>map instanceof Map: {String(map instanceof Map)} · {[...map].map(([k, v]) => `${k}→${v}`).join(", ")}</li>
      <li>set instanceof Set: {String(set instanceof Set)} · {[...set].join(", ")}</li>
    </ul>
  );
}
