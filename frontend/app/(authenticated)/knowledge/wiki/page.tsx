import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requireSession } from "@/lib/rbac/require-permission";
import { RequireModule } from "@/components/auth/require-module";
import WikiHomePage from "@/features/wiki/components/wiki-home-page";
import { prefetchKbHome } from "@/lib/prefetch/knowledge";
import KnowledgeBaseLoading from "./loading";

async function WikiHomeHydrated() {
  await requireSession();
  const state = await prefetchKbHome();
  return (
    <HydrationBoundary state={state}>
      <RequireModule module="kb">
        <WikiHomePage />
      </RequireModule>
    </HydrationBoundary>
  );
}

export default function KnowledgeBasePage() {
  return (
    <Suspense fallback={<KnowledgeBaseLoading />}>
      <WikiHomeHydrated />
    </Suspense>
  );
}
