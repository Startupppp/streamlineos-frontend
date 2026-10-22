import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requireSession } from "@/lib/rbac/require-permission";
import { RequireModule } from "@/components/auth/require-module";
import CompanyDocumentsPage from "@/features/wiki/components/company-documents-page";
import { prefetchKbCompanyDocuments } from "@/lib/prefetch/knowledge";
import KnowledgeBaseCompanyDocumentsLoading from "./loading";

async function CompanyDocumentsHydrated() {
  await requireSession();
  const state = await prefetchKbCompanyDocuments();
  return (
    <HydrationBoundary state={state}>
      <RequireModule module="kb">
        <CompanyDocumentsPage />
      </RequireModule>
    </HydrationBoundary>
  );
}

export default function KnowledgeBaseCompanyDocumentsRoute() {
  return (
    <Suspense fallback={<KnowledgeBaseCompanyDocumentsLoading />}>
      <CompanyDocumentsHydrated />
    </Suspense>
  );
}
