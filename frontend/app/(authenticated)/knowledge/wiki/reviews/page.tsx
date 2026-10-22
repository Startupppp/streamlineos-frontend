import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requireSession } from "@/lib/rbac/require-permission";
import { RequireModule } from "@/components/auth/require-module";
import ReviewsPage from "@/features/wiki/components/reviews-page";
import { prefetchKbReviews } from "@/lib/prefetch/knowledge";
import KnowledgeBaseReviewsLoading from "./loading";

async function ReviewsHydrated() {
  await requireSession();
  const state = await prefetchKbReviews();
  return (
    <HydrationBoundary state={state}>
      <RequireModule module="kb">
        <ReviewsPage />
      </RequireModule>
    </HydrationBoundary>
  );
}

export default function KnowledgeBaseReviewsPage() {
  return (
    <Suspense fallback={<KnowledgeBaseReviewsLoading />}>
      <ReviewsHydrated />
    </Suspense>
  );
}
