import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requireSession } from "@/lib/rbac/require-permission";
import { RequireModule } from "@/components/auth/require-module";
import SharedPage from "@/features/wiki/components/shared-page";
import { prefetchKbSharedPages } from "@/lib/prefetch/knowledge";
import SharedFilesLoading from "./loading";

async function SharedHydrated() {
  await requireSession();
  const state = await prefetchKbSharedPages();
  return (
    <HydrationBoundary state={state}>
      <RequireModule module="kb">
        <SharedPage />
      </RequireModule>
    </HydrationBoundary>
  );
}

export default function KnowledgeBaseSharedPage() {
  return (
    <Suspense fallback={<SharedFilesLoading />}>
      <SharedHydrated />
    </Suspense>
  );
}
