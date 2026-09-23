"use client";

/** Receives the raw bigint and the server-formatted string side by side. */
export function BigintView({ raw, formatted }: { raw: bigint; formatted: string }) {
  let json: string;
  try {
    json = JSON.stringify({ raw });
  } catch (e) {
    json = `${(e as Error).name}: ${(e as Error).message}`;
  }
  return (
    <ul className="space-y-1 font-mono text-xs">
      <li>raw: typeof {typeof raw} = {raw.toString()}</li>
      <li>formatted on the server: {formatted}</li>
      <li>JSON.stringify(raw) on the client: <span className="text-red-500">{json}</span></li>
    </ul>
  );
}
