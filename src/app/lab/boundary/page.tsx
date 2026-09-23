import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { formatUnits } from "viem";
import { Case, Mode, Skeleton } from "@/components/ui";
import { BigintView } from "@/components/lab/BigintView";
import { BuiltinsView } from "@/components/lab/BuiltinsView";
import { MoneyView } from "@/components/lab/MoneyView";
import { PromiseReader } from "@/components/lab/PromiseReader";
import { ServerFnButton } from "@/components/lab/ServerFnButton";
import { Toggle } from "@/components/lab/Toggle";
import { Money } from "@/components/lab/money";
import { stampClick } from "../actions";
import { serverFacts } from "./secret";

export const metadata = { title: "Server → client boundary" };

const code = (s: string) => <code className="font-mono text-xs">{s}</code>;
const breakLink = (href: string) => (
  <Link href={href} className="ml-1 text-accent hover:underline">see it break →</Link>
);

/**
 * Every prop handed to a 'use client' component is serialized by React (the RSC payload).
 * Each card: what was tried, what Next.js said, and the working pattern rendered live.
 */
export default function BoundaryPage() {
  const wei = 1_234_567_890_000_000_000n; // what viem returns for 1.23456789 WETH
  const money = new Money("1.5", "WETH");
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">The server → client boundary</h1>
        <p className="text-sm text-muted">
          What survives the trip from a Server Component to a Client Component. <Mode kind="static" /> except the promise card <Mode kind="live" />
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Case
          title="bigint prop"
          tried={<>Passing a viem {code("bigint")} straight to a client component, expecting an error.</>}
          said="Nothing: it crosses. React 19 encodes bigint in the payload ($n…). The trap is JSON: TypeError: Do not know how to serialize a BigInt"
          fix={<>Still format on the server ({code("formatUnits(wei, 18)")}): decimals live there, and the client needs no viem. Never {code("JSON.stringify")} a raw bigint (Route Handlers, storage).</>}
        >
          <BigintView raw={wei} formatted={`${formatUnits(wei, 18)} WETH`} />
        </Case>

        <Case
          title="Function prop"
          tried={<>{code("<Inspect value={() => …} />")}: a plain callback as a prop.{breakLink("/lab/boundary/function")}</>}
          said={'Error: Functions cannot be passed directly to Client Components unless you explicitly expose it by marking it with "use server". Or maybe you meant to call this function rather than return it. (dev; production: React error #441 + digest)'}
          fix={<>Pass a Server Function ({code("'use server'")} in {code("src/app/lab/actions.ts")}). The client gets a reference and calls it over POST.</>}
        >
          <ServerFnButton action={stampClick} />
        </Case>

        <Case
          title="Date, Map, Set"
          tried="Passing a Date, a Map and a Set as props."
          said="Nothing: all three arrive as real instances."
          fix={<>Fine as is. The trap is formatting: {code("toLocaleString()")} runs with the server&apos;s timezone/locale in SSR and the browser&apos;s on hydration. Format on one side only, or mark the element {code("suppressHydrationWarning")}.</>}
        >
          <BuiltinsView
            date={new Date("2026-09-23T12:00:00Z")}
            map={new Map([["WETH", "0xC02a…6Cc2"], ["USDC", "0xA0b8…eB48"]])}
            set={new Set(["supply", "borrow"])}
          />
        </Case>

        <Case
          title="Class instance"
          tried={<>{code("new Money('1.5', 'WETH')")} as a prop.{breakLink("/lab/boundary/class")}</>}
          said="Error: Only plain objects, and a few built-ins, can be passed to Client Components from Server Components. Classes or null prototypes are not supported. (dev; production: React error #441 + digest)"
          fix="It throws (not a silent downgrade). Pass plain data, rebuild the instance on the client if you need its methods."
        >
          <MoneyView data={{ amount: money.amount, symbol: money.symbol }} />
        </Case>

        <Case
          title="Promise"
          tried="Handing an un-awaited promise to a client component."
          said="Nothing: promises cross and stream. The client reads them with use()."
          fix={<>Create the promise on the server, don&apos;t await it, wrap the reader in {code("<Suspense>")}. Here it resolves after 800 ms, per request ({code("await connection()")}).</>}
        >
          <Suspense fallback={<div className="space-y-2"><p className="text-xs text-muted">Waiting 800 ms for the server promise…</p><Skeleton rows={1} /></div>}>
            <PromiseSource />
          </Suspense>
        </Case>

        <Case
          title="children slot"
          tried="A client wrapper with state around a server subtree that imports a server-only module."
          said="Nothing: children arrive as rendered output, not as code in the client bundle."
          fix={<>Nest server work in the slot: {code("<Toggle><ServerPanel /></Toggle>")}. The panel may import {code("server-only")} code; Toggle may not.</>}
        >
          <Toggle>
            <p className="font-mono text-xs">{serverFacts()}</p>
          </Toggle>
        </Case>

        <Case
          title="server-only import in a client component"
          tried={<>{code("import { serverFacts } from './secret'")} inside a {code("'use client'")} file ({code("secret.ts")} starts with {code("import 'server-only'")}).</>}
          said={'Build error (Turbopack): You\'re importing a module that depends on "server-only" into a React Client Component module. This API is only available in Server Components but one of its parents is marked with "use client", so this module is also a Client Component.'}
          fix="Not shipped. Keep the import in a Server Component and pass the result (or the component, via children) down."
        />
      </div>
    </div>
  );
}

async function PromiseSource() {
  await connection();
  const promise = new Promise<string>((resolve) =>
    setTimeout(() => resolve(`resolved on the server at ${new Date().toISOString()}`), 800),
  );
  return <PromiseReader promise={promise} />;
}
