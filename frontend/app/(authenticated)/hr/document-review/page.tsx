import { requirePermission } from "@/lib/rbac/require-permission";
import { DocumentReviewPage } from "@/features/hr/document-review/document-review-page";

export default async function HrDocumentReviewPage() {
  await requirePermission("hr:documents:view");
  return <DocumentReviewPage />;
}
