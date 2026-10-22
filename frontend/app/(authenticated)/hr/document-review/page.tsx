import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { prefetchHrDocumentReview } from "@/lib/prefetch/hr-people";
import { DocumentReviewPage } from "@/features/hr/document-review/document-review-page";
import DocumentReviewLoading from "./loading";

async function DocumentReviewHydrated() {
  const state = await prefetchHrDocumentReview();
  return (
    <HydrationBoundary state={state}>
      <DocumentReviewPage />
    </HydrationBoundary>
  );
}

export default async function HrDocumentReviewPage() {
  await requirePermission("hr:documents:view");
  return (
    <Suspense fallback={<DocumentReviewLoading />}>
      <DocumentReviewHydrated />
    </Suspense>
  );
}
