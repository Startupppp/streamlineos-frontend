import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requireSession } from "@/lib/rbac/require-permission";
import { RequireModule } from "@/components/auth/require-module";
import ImportPage from "@/features/wiki/components/import-page";
import { prefetchKbSpaces } from "@/lib/prefetch/knowledge";
import WikiImportLoading from "./loading";

async function ImportHydrated() {
  await requireSession();
  const state = await prefetchKbSpaces();
  return (
    <HydrationBoundary state={state}>
      <RequireModule module="kb">
        <ImportPage />
      </RequireModule>
    </HydrationBoundary>
  );
}

export default function KnowledgeBaseImportPage() {
  return (
    <Suspense fallback={<WikiImportLoading />}>
      <ImportHydrated />
    </Suspense>
  );
}
