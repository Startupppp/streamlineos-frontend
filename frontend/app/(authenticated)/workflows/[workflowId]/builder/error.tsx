"use client";

import { useRouter } from "next/navigation";
import { ErrorState } from "@/components/shared/error-state";

export default function BuilderError({ reset }: { reset: () => void }) {
  const router = useRouter();

  function handleRetry() {
    reset();
    router.back();
  }

  return <ErrorState title="Failed to load builder" onRetry={handleRetry} className="flex-1 h-full" />;
}
