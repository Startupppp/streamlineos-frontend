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

/**
 * Oversight for a product that acts without asking.
 *
 * One habit rather than fifty screens: everything the system decided across the
 * organisation, why, and a one-click undo for anything still reversible.
 *
 * A server component: `crm:autonomy:view` is checked here, before anything
 * renders, and every panel below is its own client leaf.
 */
export default async function AutonomyReviewPage() {
  await requirePermission("crm:autonomy:view");
  return (
    <PageWrapper
      title="What the system did"
      subtitle="Every action taken without being asked, and what it was based on."
    >
      <div className="flex flex-col gap-gap-section">
        {/* First, because it is the only thing here that is time-critical. */}
        <PendingSendsPanel />
        {/*
          Directly under the countdown, because that is where anything it
          starts appears. Renders nothing without the manage key, so a
          reviewer sees no gap.
        */}
        <ConsiderOutboundPanel />
        {/* Directly under it: the same decision, after the window closed. */}
        <ClassStopsPanel />
        <AutonomyScoreboard />
        <AutonomySwitchesPanel />
        {/* Beside the switches: it is the same kind of choice, one rung down. */}
        <AutoQuotePanel />
        {/* Under the switches, because the kill switch above vetoes all of it. */}
        <RepairPoliciesPanel />
        {/* Directly under the grant: what was done with it. */}
        <RepairActivityPanel />
        {/* Renders nothing without the manage key, so a reviewer sees no gap. */}
        <ColdOutboundPanel />
        <AutonomyReviewFeed />
      </div>
    </PageWrapper>
  );
}
