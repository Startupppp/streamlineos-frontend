import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { prefetchHrDocumentTemplates } from "@/lib/prefetch/hr-people";
import { TemplatesListPage } from "@/features/hr/documents/templates-list-page";
import DocumentTemplatesLoading from "./loading";

async function DocumentTemplatesHydrated() {
  const state = await prefetchHrDocumentTemplates();
  return (
    <HydrationBoundary state={state}>
      <TemplatesListPage />
    </HydrationBoundary>
  );
}

export default async function HrDocumentTemplatesPage() {
  await requirePermission("hr:documents:view");
  return (
    <Suspense fallback={<DocumentTemplatesLoading />}>
      <DocumentTemplatesHydrated />
    </Suspense>
  );
}
