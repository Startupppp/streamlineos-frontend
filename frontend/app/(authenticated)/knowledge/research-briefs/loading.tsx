import { PageWrapper } from "@/components/ui/page-wrapper";
import { BriefListSkeleton } from "@/features/help-centre/components/kb-research-briefs-page-content";

export default function KnowledgeResearchBriefsLoading() {
  return (
    <PageWrapper
      title="Research Briefs"
      subtitle="AI-synthesized reports from your knowledge base"
      noInternalScroll
    >
      <BriefListSkeleton />
    </PageWrapper>
  );
}
