import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requireSession } from "@/lib/rbac/require-permission";
import { RequireModule } from "@/components/auth/require-module";
import PrivatePage from "@/features/wiki/components/private-page";
import { prefetchKbPrivatePages } from "@/lib/prefetch/knowledge";
import MyFilesLoading from "./loading";

async function PrivateHydrated() {
  await requireSession();
  const state = await prefetchKbPrivatePages();
  return (
    <HydrationBoundary state={state}>
      <RequireModule module="kb">
        <PrivatePage />
      </RequireModule>
    </HydrationBoundary>
  );
}

export default function KnowledgeBasePrivatePage() {
  return (
    <Suspense fallback={<MyFilesLoading />}>
      <PrivateHydrated />
    </Suspense>
  );
}
