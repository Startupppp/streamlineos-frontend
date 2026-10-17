import { notFound } from "next/navigation";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { KbResearchBriefDetail } from "@/features/help-centre/components/kb-research-brief-detail";

interface PageProps {
  params: Promise<{ briefId: string }>;
}

export default async function KnowledgeResearchBriefPage({ params }: PageProps) {
  await enforceRouteAccess("/knowledge/research-briefs/[briefId]");
  const { briefId } = await params;
  const id = Number(briefId);
  if (!Number.isInteger(id) || id <= 0) notFound();
  return (
    <PageWrapper
      title="Research Brief"
      subtitle="AI-synthesized report"
      backHref="/knowledge/research-briefs"
    >
      <KbResearchBriefDetail briefId={id} basePath="/knowledge/research-briefs" />
    </PageWrapper>
  );
}
