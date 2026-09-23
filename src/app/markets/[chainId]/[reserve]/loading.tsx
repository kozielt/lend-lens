import { Skeleton } from "@/components/ui";

/** Segment-level Suspense fallback: shown while the reserve page's dynamic parts stream in. */
export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 animate-pulse rounded bg-border" />
      <Skeleton rows={6} />
    </div>
  );
}
