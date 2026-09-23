import Link from "next/link";
import { lookupWallet } from "../actions";
import { Card } from "@/components/ui";

/** Fully static: no data, a plain form posting to a Server Function that redirects. Works without JavaScript. */
export default function WalletIndexPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Wallet health factor</h1>
      <Card title="Look up an address">
        <form action={lookupWallet} className="flex flex-wrap gap-2">
          <input
            name="address"
            placeholder="0x…"
            required
            pattern="0x[0-9a-fA-F]{40}"
            className="min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-2 font-mono text-sm"
          />
          <button type="submit" className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white">Open</button>
        </form>
        <p className="mt-3 text-xs text-muted">Some recent borrowers on the Ethereum core market to try:</p>
        <ul className="mt-1 space-y-1 font-mono text-xs">
          {EXAMPLES.map((a) => (
            <li key={a}>
              <Link href={`/wallet/${a}`} className="hover:text-accent">{a}</Link>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

const EXAMPLES = [
  "0x9886C9c2A743dE2D82A182207F2028a8a74906EC",
  "0x77412b7F2a1cAC7f067395Fcce3b7D8f793ba436",
  "0x61497e46C54eaBa0b9F305A3148E571Ad79930e2",
  "0x2dE640a18fE3480aa802aca91f70177aDA103391",
];
