import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { KbResearchBriefsPageContent } from "@/features/help-centre/components/kb-research-briefs-page-content";
import { prefetchKbResearchBriefs } from "@/lib/prefetch/knowledge";
import KnowledgeResearchBriefsLoading from "./loading";

async function ResearchBriefsHydrated() {
  await requirePermission("kb:pages:view");
  const state = await prefetchKbResearchBriefs();
  return (
    <HydrationBoundary state={state}>
      <KbResearchBriefsPageContent basePath="/knowledge/research-briefs" />
    </HydrationBoundary>
  );
}

export default function KnowledgeResearchBriefsPage() {
  return (
    <Suspense fallback={<KnowledgeResearchBriefsLoading />}>
      <ResearchBriefsHydrated />
    </Suspense>
  );
}
