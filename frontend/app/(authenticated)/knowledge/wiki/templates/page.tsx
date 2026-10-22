import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requireSession } from "@/lib/rbac/require-permission";
import { RequireModule } from "@/components/auth/require-module";
import TemplatesPage from "@/features/wiki/components/templates-page";
import { prefetchKbTemplates } from "@/lib/prefetch/knowledge";
import KnowledgeBaseTemplatesLoading from "./loading";

async function TemplatesHydrated() {
  await requireSession();
  const state = await prefetchKbTemplates();
  return (
    <HydrationBoundary state={state}>
      <RequireModule module="kb">
        <TemplatesPage />
      </RequireModule>
    </HydrationBoundary>
  );
}

export default function KnowledgeBaseTemplatesPage() {
  return (
    <Suspense fallback={<KnowledgeBaseTemplatesLoading />}>
      <TemplatesHydrated />
    </Suspense>
  );
}
