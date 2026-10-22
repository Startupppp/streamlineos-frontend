import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { prefetchHrDocumentTypes } from "@/lib/prefetch/hr-people";
import { DocumentTypesPage } from "@/features/hr/document-types/document-types-page";
import DocumentTypesLoading from "./loading";

async function DocumentTypesHydrated() {
  const state = await prefetchHrDocumentTypes();
  return (
    <HydrationBoundary state={state}>
      <DocumentTypesPage />
    </HydrationBoundary>
  );
}

export default async function HrDocumentTypesPage() {
  await requirePermission("hr:documents:manage");
  return (
    <Suspense fallback={<DocumentTypesLoading />}>
      <DocumentTypesHydrated />
    </Suspense>
  );
}
