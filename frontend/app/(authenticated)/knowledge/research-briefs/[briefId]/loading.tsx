import { PageWrapper } from "@/components/ui/page-wrapper";
import { ResearchBriefDetailSkeleton } from "@/features/help-centre/components/kb-research-brief-detail";

export default function KnowledgeResearchBriefDetailLoading() {
  return (
    <PageWrapper
      title="Research Brief"
      subtitle="AI-synthesized report"
      backHref="/knowledge/research-briefs"
      noInternalScroll
    >
      <ResearchBriefDetailSkeleton />
    </PageWrapper>
  );
}