import { requirePermission } from "@/lib/rbac/require-permission";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { AutonomyReviewFeed } from "@/features/crm/autonomy/autonomy-review-feed";
import { AutonomySwitchesPanel } from "@/features/crm/autonomy/autonomy-switches-panel";
import { RepairPoliciesPanel } from "@/features/crm/autonomy/repair-policies-panel";
import { RepairActivityPanel } from "@/features/crm/autonomy/repair-activity-panel";
import { ColdOutboundPanel } from "@/features/crm/autonomy/cold-outbound-panel";
import { AutonomyScoreboard } from "@/features/crm/autonomy/autonomy-scoreboard";
import { PendingSendsPanel } from "@/features/crm/autonomy/pending-sends-panel";
import { ClassStopsPanel } from "@/features/crm/autonomy/class-stops-panel";
import { AutoQuotePanel } from "@/features/crm/autonomy/auto-quote-panel";
import { ConsiderOutboundPanel } from "@/features/crm/autonomy/consider-outbound-panel";

export default async function AutonomyReviewPage() {
  await requirePermission("crm:autonomy:view");
  return (
    <PageWrapper
      title="What the system did"
      subtitle="Every action taken without being asked, and what it was based on."
    >
      <div className="flex flex-col gap-gap-section">
        
        <PendingSendsPanel />
        
        <ConsiderOutboundPanel />
        
        <ClassStopsPanel />
        <AutonomyScoreboard />
        <AutonomySwitchesPanel />
        
        <AutoQuotePanel />
        
        <RepairPoliciesPanel />
        
        <RepairActivityPanel />
        
        <ColdOutboundPanel />
        <AutonomyReviewFeed />
      </div>
    </PageWrapper>
  );
}
