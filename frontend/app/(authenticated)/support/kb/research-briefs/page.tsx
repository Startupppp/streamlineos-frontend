import { requirePermission } from "@/lib/rbac/require-permission";
import { KbResearchBriefsPageContent } from "@/features/help-centre/components/kb-research-briefs-page-content";

export default async function KbResearchBriefsPage() {
  await requirePermission("kb:pages:view");
  return <KbResearchBriefsPageContent />;
}
