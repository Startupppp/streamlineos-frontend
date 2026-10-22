import { Suspense } from "react";
import { notFound } from "next/navigation";
import { HydrationBoundary } from "@tanstack/react-query";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { KbResearchBriefDetail } from "@/features/help-centre/components/kb-research-brief-detail";
import { prefetchKbResearchBriefDetail } from "@/lib/prefetch/knowledge";
import KnowledgeResearchBriefDetailLoading from "./loading";

interface PageProps {
  params: Promise<{ briefId: string }>;
}

async function ResearchBriefDetailHydrated({ params }: PageProps) {
  await enforceRouteAccess("/knowledge/research-briefs/[briefId]");
  const { briefId } = await params;
  const id = Number(briefId);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const state = await prefetchKbResearchBriefDetail(id);
  return (
    <HydrationBoundary state={state}>
      <PageWrapper
        title="Research Brief"
        subtitle="AI-synthesized report"
        backHref="/knowledge/research-briefs"
      >
        <KbResearchBriefDetail briefId={id} basePath="/knowledge/research-briefs" />
      </PageWrapper>
    </HydrationBoundary>
  );
}

export default function KnowledgeResearchBriefPage({ params }: PageProps) {
  return (
    <Suspense fallback={<KnowledgeResearchBriefDetailLoading />}>
      <ResearchBriefDetailHydrated params={params} />
    </Suspense>
  );
}
