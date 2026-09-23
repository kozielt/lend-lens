"use client";

import { LabError } from "@/components/lab/LabError";

export default function Error(props: { error: Error & { digest?: string }; retry: () => void }) {
  return <LabError {...props} />;
}
