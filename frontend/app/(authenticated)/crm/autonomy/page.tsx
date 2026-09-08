"use client";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { LoadingState } from "@/components/shared/loading-state";
import { NoPermissionState } from "@/components/shared/no-permission-state";
import { useAccess, useCan } from "@/hooks/api/access";
import { AutonomyReviewFeed } from "@/features/crm/autonomy/autonomy-review-feed";
import { AutonomySwitchesPanel } from "@/features/crm/autonomy/autonomy-switches-panel";
import { RepairPoliciesPanel } from "@/features/crm/autonomy/repair-policies-panel";
import { AutonomyScoreboard } from "@/features/crm/autonomy/autonomy-scoreboard";
import { PendingSendsPanel } from "@/features/crm/autonomy/pending-sends-panel";

/**
 * Oversight for a product that acts without asking.
 *
 * One habit rather than fifty screens: everything the system decided across the
 * organisation, why, and a one-click undo for anything still reversible.
 */
export default function AutonomyReviewPage() {
  const { isPending } = useAccess();
  const canView = useCan("crm:autonomy:view");

  return (
    <PageWrapper
      title="What the system did"
      subtitle="Every action taken without being asked, and what it was based on."
    >
      {isPending ? (
        <LoadingState variant="page" />
      ) : !canView ? (
        <NoPermissionState
          permission="crm:autonomy:view"
          description="You don’t have permission to review what the system decided."
        />
      ) : (
        <div className="flex flex-col gap-gap-section">
          {/* First, because it is the only thing here that is time-critical. */}
          <PendingSendsPanel />
          <AutonomyScoreboard />
          <AutonomySwitchesPanel />
          {/* Under the switches, because the kill switch above vetoes all of it. */}
          <RepairPoliciesPanel />
          <AutonomyReviewFeed />
        </div>
      )}
    </PageWrapper>
  );
}
