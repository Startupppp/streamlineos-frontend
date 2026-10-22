import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { prefetchHrFeedbackCycles } from "@/lib/prefetch/hr-talent";
import { FeedbackPage } from "@/features/hr/feedback/feedback-page";
import FeedbackLoading from "./loading";

async function FeedbackHydrated() {
  await requirePermission("hr:feedback:view");
  const state = await prefetchHrFeedbackCycles();
  return (
    <HydrationBoundary state={state}>
      <FeedbackPage />
    </HydrationBoundary>
  );
}

export default function HrFeedbackPage() {
  return (
    <Suspense fallback={<FeedbackLoading />}>
      <FeedbackHydrated />
    </Suspense>
  );
}
