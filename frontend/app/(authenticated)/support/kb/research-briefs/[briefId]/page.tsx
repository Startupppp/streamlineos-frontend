import { notFound } from "next/navigation";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { KbResearchBriefDetail } from "@/features/help-centre/components/kb-research-brief-detail";

interface PageProps {
  params: Promise<{ briefId: string }>;
}

export default async function KbResearchBriefPage({ params }: PageProps) {
  const { briefId } = await params;
  const id = Number(briefId);
  if (!Number.isInteger(id) || id <= 0) notFound();
  return (
    <PageWrapper
      title="Research Brief"
      subtitle="AI-synthesized report"
      backHref="/support/kb/research-briefs"
    >
      <KbResearchBriefDetail briefId={id} />
    </PageWrapper>
  );
}
