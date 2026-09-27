"use client";

import { useCanState } from "@/hooks/api/access";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { KbClockIcon, KbTriangleAlertIcon } from "../lib/kb-icons";

interface SpaceManagerHealthSummaryProps {
  pagesWithReviewPolicy: number;
  pagesOverdueForReview: number;
}

export function SpaceManagerHealthSummary({
  pagesWithReviewPolicy,
  pagesOverdueForReview,
}: SpaceManagerHealthSummaryProps) {
  const state = useCanState("kb:spaces:manage");
  if (state === "denied") return null;
  if (pagesWithReviewPolicy === 0) return null;

  return (
    <StatCardGrid cols={2} stackOnMobile>
      <StatCard
        label="Under review policy"
        value={pagesWithReviewPolicy}
        icon={KbClockIcon}
        tone="default"
      />
      <StatCard
        label="Overdue for review"
        value={pagesOverdueForReview}
        icon={KbTriangleAlertIcon}
        tone={pagesOverdueForReview > 0 ? "amber" : "default"}
      />
    </StatCardGrid>
  );
}
