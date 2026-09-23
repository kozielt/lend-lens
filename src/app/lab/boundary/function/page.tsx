import { Suspense } from "react";
import { connection } from "next/server";
import { Skeleton } from "@/components/ui";
import { Inspect } from "@/components/lab/Inspect";

export const metadata = { title: "Boundary: function prop" };

/** Fails on purpose at request time: a plain callback cannot be serialized. */
export default function FunctionPropPage() {
  return (
    <Suspense fallback={<Skeleton rows={2} />}>
      <Broken />
    </Suspense>
  );
}

async function Broken() {
  await connection(); // throw at request time, not during the build's prerender
  return <Inspect value={() => "hello from a closure"} />;
}
