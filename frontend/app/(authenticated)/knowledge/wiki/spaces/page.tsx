import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requireSession } from "@/lib/rbac/require-permission";
import { RequireModule } from "@/components/auth/require-module";
import SpacesPage from "@/features/wiki/components/spaces-page";
import { prefetchKbSpaces } from "@/lib/prefetch/knowledge";
import KnowledgeBaseSpacesLoading from "./loading";

async function SpacesHydrated() {
  await requireSession();
  const state = await prefetchKbSpaces();
  return (
    <HydrationBoundary state={state}>
      <RequireModule module="kb">
        <SpacesPage />
      </RequireModule>
    </HydrationBoundary>
  );
}

export default function KnowledgeBaseSpacesPage() {
  return (
    <Suspense fallback={<KnowledgeBaseSpacesLoading />}>
      <SpacesHydrated />
    </Suspense>
  );
}
