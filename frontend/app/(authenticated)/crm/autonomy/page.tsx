import { requirePermission } from "@/lib/rbac/require-permission";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { AutonomyReviewFeed } from "@/features/crm/autonomy/autonomy-review-feed";
import { AutonomySwitchesPanel } from "@/features/crm/autonomy/autonomy-switches-panel";
import { AutonomyScoreboard } from "@/features/crm/autonomy/autonomy-scoreboard";
import { PendingSendsPanel } from "@/features/crm/autonomy/pending-sends-panel";

export default async function AutonomyReviewPage() {
  await requirePermission("crm:autonomy:view");
  return (
    <PageWrapper
      title="What the system did"
      subtitle="Every action taken without being asked, and what it was based on."
    >
      <div className="flex flex-col gap-gap-section">
        <PendingSendsPanel />
        <AutonomyScoreboard />
        <AutonomySwitchesPanel />
        <AutonomyReviewFeed />
      </div>
    </PageWrapper>
  );
}
