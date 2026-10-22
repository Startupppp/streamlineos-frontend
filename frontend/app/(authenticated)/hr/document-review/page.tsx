import { Suspense } from "react";
import { requirePermission } from "@/lib/rbac/require-permission";
import { DocumentReviewPage } from "@/features/hr/document-review/document-review-page";
import DocumentReviewLoading from "./loading";

export default async function HrDocumentReviewPage() {
  await requirePermission("hr:documents:view");
  return (
    <Suspense fallback={<DocumentReviewLoading />}>
      <DocumentReviewPage />
    </Suspense>
  );
}
