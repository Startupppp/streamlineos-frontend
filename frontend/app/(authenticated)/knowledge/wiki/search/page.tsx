import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requireSession } from "@/lib/rbac/require-permission";
import { RequireModule } from "@/components/auth/require-module";
import WikiSearchPage from "@/features/wiki/components/wiki-search-page";
import { prefetchKbSearchPage } from "@/lib/prefetch/knowledge";
import SearchFilesLoading from "./loading";

async function WikiSearchHydrated() {
  await requireSession();
  const state = await prefetchKbSearchPage();
  return (
    <HydrationBoundary state={state}>
      <RequireModule module="kb">
        <WikiSearchPage />
      </RequireModule>
    </HydrationBoundary>
  );
}

export default function KnowledgeBaseSearchPage() {
  return (
    <Suspense fallback={<SearchFilesLoading />}>
      <WikiSearchHydrated />
    </Suspense>
  );
}
