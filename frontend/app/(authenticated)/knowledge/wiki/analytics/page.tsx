import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requireSession } from "@/lib/rbac/require-permission";
import { RequireModule } from "@/components/auth/require-module";
import KnowledgeAnalyticsPage from "@/features/wiki/components/knowledge-analytics-page";
import { prefetchKbAnalytics } from "@/lib/prefetch/knowledge";
import KnowledgeBaseAnalyticsLoading from "./loading";

async function KnowledgeAnalyticsHydrated() {
  await requireSession();
  const state = await prefetchKbAnalytics();
  return (
    <HydrationBoundary state={state}>
      <RequireModule module="kb">
        <KnowledgeAnalyticsPage />
      </RequireModule>
    </HydrationBoundary>
  );
}

export default function KnowledgeBaseAnalyticsPage() {
  return (
    <Suspense fallback={<KnowledgeBaseAnalyticsLoading />}>
      <KnowledgeAnalyticsHydrated />
    </Suspense>
  );
}
