"use client";

import { use } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { KbResearchBriefDetail } from "@/features/help-centre/components/kb-research-brief-detail";

interface PageProps {
  params: Promise<{ briefId: string }>;
}

export default function KbResearchBriefPage({ params }: PageProps) {
  const { briefId } = use(params);
  const id = Number(briefId);

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
