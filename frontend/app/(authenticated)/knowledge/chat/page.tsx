import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requireSession } from "@/lib/rbac/require-permission";
import { RequireModule } from "@/components/auth/require-module";
import KnowledgeBasePage from "@/features/wiki/components/knowledge-base-page";
import { prefetchKbConversations } from "@/lib/prefetch/knowledge";
import KnowledgeChatLoading from "./loading";

async function KnowledgeChatHydrated() {
  await requireSession();
  const state = await prefetchKbConversations();
  return (
    <HydrationBoundary state={state}>
      <RequireModule module="kb">
        <KnowledgeBasePage />
      </RequireModule>
    </HydrationBoundary>
  );
}

export default function KnowledgeChatRoute() {
  return (
    <Suspense fallback={<KnowledgeChatLoading />}>
      <KnowledgeChatHydrated />
    </Suspense>
  );
}
