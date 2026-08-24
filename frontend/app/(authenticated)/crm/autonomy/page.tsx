"use client";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { useCan } from "@/hooks/api/access";
import { AutonomyReviewFeed } from "@/features/crm/autonomy/autonomy-review-feed";
import { AutonomySwitchesPanel } from "@/features/crm/autonomy/autonomy-switches-panel";
import { AutonomyScoreboard } from "@/features/crm/autonomy/autonomy-scoreboard";
import { PendingSendsPanel } from "@/features/crm/autonomy/pending-sends-panel";

/**
 * Oversight for a product that acts without asking.
 *
 * One habit rather than fifty screens: everything the system decided across the
 * organisation, why, and a one-click undo for anything still reversible.
 */
export default function AutonomyReviewPage() {
  const canView = useCan("crm:autonomy:view");

  if (!canView) return null;

  return (
    <PageWrapper
      title="What the system did"
      subtitle="Every action taken without being asked, and what it was based on."
    >
      <div className="flex flex-col gap-gap-section">
        {/* First, because it is the only thing here that is time-critical. */}
        <PendingSendsPanel />
        <AutonomyScoreboard />
        <AutonomySwitchesPanel />
        <AutonomyReviewFeed />
      </div>
    </PageWrapper>
  );
}
