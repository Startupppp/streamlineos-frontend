import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requireSession } from "@/lib/rbac/require-permission";
import { RequireModule } from "@/components/auth/require-module";
import TrashPage from "@/features/wiki/components/trash-page";
import { prefetchKbTrash } from "@/lib/prefetch/knowledge";
import KnowledgeBaseTrashLoading from "./loading";

async function TrashHydrated() {
  await requireSession();
  const state = await prefetchKbTrash();
  return (
    <HydrationBoundary state={state}>
      <RequireModule module="kb">
        <TrashPage />
      </RequireModule>
    </HydrationBoundary>
  );
}

export default function KnowledgeBaseTrashPage() {
  return (
    <Suspense fallback={<KnowledgeBaseTrashLoading />}>
      <TrashHydrated />
    </Suspense>
  );
}
