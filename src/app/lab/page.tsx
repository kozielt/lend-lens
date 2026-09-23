import Link from "next/link";
import { Card, Mode } from "@/components/ui";

/** Static index of the teaching pages. Each drill is a route under /lab. */
export default function LabPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Lab</h1>
        <p className="text-sm text-muted">
          Drills that show one framework rule at a time. Every card says what was tried, what Next.js said, and the pattern that works. <Mode kind="static" />
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {DRILLS.map((d) => (
          <Card key={d.href} title={<Link href={d.href} className="hover:text-accent">{d.title}</Link>}>
            <p className="text-sm text-muted">{d.blurb}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}

const DRILLS = [
  {
    href: "/lab/boundary",
    title: "The server → client boundary",
    blurb: "What can cross from a Server Component to a Client Component (and what cannot): bigint, functions, Dates, class instances, promises, children.",
  },
  {
    href: "/lab/cache",
    title: "What makes a cache key",
    blurb: "'use cache' entries keyed by arguments and closed-over values, a private per-request cache that reads a cookie, and tag versus time expiry side by side.",
  },
];
