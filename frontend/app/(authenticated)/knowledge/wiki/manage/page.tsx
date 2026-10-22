import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requireSession } from "@/lib/rbac/require-permission";
import { RequireModule } from "@/components/auth/require-module";
import ContentHealthPage from "@/features/wiki/components/content-health-page";
import { prefetchKbContentHealth } from "@/lib/prefetch/knowledge";
import KnowledgeBaseManageLoading from "./loading";

async function ContentHealthHydrated() {
  await requireSession();
  const state = await prefetchKbContentHealth();
  return (
    <HydrationBoundary state={state}>
      <RequireModule module="kb">
        <ContentHealthPage />
      </RequireModule>
    </HydrationBoundary>
  );
}

export default function KnowledgeBaseManagePage() {
  return (
    <Suspense fallback={<KnowledgeBaseManageLoading />}>
      <ContentHealthHydrated />
    </Suspense>
  );
}
