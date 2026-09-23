import { Suspense } from "react";
import { connection } from "next/server";
import { Skeleton } from "@/components/ui";
import { Inspect } from "@/components/lab/Inspect";
import { Money } from "@/components/lab/money";

export const metadata = { title: "Boundary: class instance" };

/** Fails on purpose at request time: a class instance is not a plain object. */
export default function ClassPropPage() {
  return (
    <Suspense fallback={<Skeleton rows={2} />}>
      <Broken />
    </Suspense>
  );
}

async function Broken() {
  await connection(); // throw at request time, not during the build's prerender
  return <Inspect value={new Money("1.5", "WETH")} />;
}
