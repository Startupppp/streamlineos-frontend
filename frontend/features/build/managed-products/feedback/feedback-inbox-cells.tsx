"use client";

import { ArrowRightCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatSubmissionAge } from "@/features/build/feedbucket/feedbucket-constants";
import { formatRelativeTime } from "@/lib/date-utils";
import type { SubmissionRow } from "../product-feedback-columns";
import { FrequencyBadge } from "./feedback-signal-badges";

/** A submission plus the derived values `PRODUCT_FEEDBACK_LAYOUT` declares. */
export type FeedbackInboxRow = SubmissionRow & {
  customerName: string | null;
  reports: number;
  linkedOpportunities: string | null;
  age: string;
  updated: string;
};

export function toFeedbackInboxRow(row: SubmissionRow): FeedbackInboxRow {
  const oppCount = row.opportunityIds?.length ?? 0;
  return {
    ...row,
    customerName: row.customer?.name ?? row.segment ?? null,
    reports: typeof row.duplicateCount === "number" ? row.duplicateCount + 1 : 1,
    linkedOpportunities: oppCount > 0 ? `${oppCount} opp${oppCount !== 1 ? "s" : ""}` : null,
    age: formatSubmissionAge(row.createdAt),
    updated: formatRelativeTime(row.updatedAt),
  };
}

export const FEEDBACK_INBOX_CELLS = {
  reports: (row: FeedbackInboxRow) => <FrequencyBadge duplicateCount={row.duplicateCount} />,
};

interface RouteToIntakeActionProps {
  row: SubmissionRow;
  onRouteToIntake: (row: SubmissionRow) => void;
}

/** Fails closed: a row the server did not mark routable gets no control. */
export function RouteToIntakeAction({ row, onRouteToIntake }: RouteToIntakeActionProps) {
  if (!row.allowedActions.includes("intake")) return null;
  return (
    <Button
      variant="ghost"
      size="sm"
      aria-label="Route to Intake"
      data-testid="route-to-intake-btn"
      data-submission-id={row.id}
      onClick={(e) => {
        e.stopPropagation();
        onRouteToIntake(row);
      }}
    >
      <ArrowRightCircle className="mr-1 h-4 w-4" />
      Intake
    </Button>
  );
}
