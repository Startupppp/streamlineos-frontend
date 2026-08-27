import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { DocumentsPage } from "@/features/hr/documents/documents-page";
import { prefetchHrDocuments } from "@/lib/prefetch/hr";

export default async function HrDocumentsPage() {
  await requirePermission("hr:documents:view");
  const state = await prefetchHrDocuments();
  return (
    <HydrationBoundary state={state}>
      <DocumentsPage />
    </HydrationBoundary>
  );
}
