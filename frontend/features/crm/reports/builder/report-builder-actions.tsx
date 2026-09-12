"use client";

import { Button } from "@/components/ui/button";

interface ReportBuilderActionsProps {
  /** Null when nothing is open, which is what decides two of the three buttons. */
  reportDefinitionId: string | null;
  canViewSaved: boolean;
  onNewReport: () => void;
  onOpenSchedule: () => void;
  onOpenSavedReports: () => void;
}

/**
 * The page's header actions.
 *
 * Only a saved report can be scheduled or replaced: a timetable names a stored
 * question, and "new report" is only meaningful once something is open.
 */
export function ReportBuilderActions({
  reportDefinitionId,
  canViewSaved,
  onNewReport,
  onOpenSchedule,
  onOpenSavedReports,
}: ReportBuilderActionsProps) {
  return (
    <div className="flex w-full items-center gap-2 sm:w-auto">
      {reportDefinitionId !== null ? (
        <Button variant="outline" size="sm" className="flex-1 sm:flex-none" onClick={onNewReport}>
          New report
        </Button>
      ) : null}
      {reportDefinitionId !== null && canViewSaved ? (
        <Button
          variant="outline"
          size="sm"
          className="flex-1 sm:flex-none"
          onClick={onOpenSchedule}
        >
          Schedule
        </Button>
      ) : null}
      {canViewSaved ? (
        <Button
          variant="outline"
          size="sm"
          className="flex-1 sm:flex-none"
          onClick={onOpenSavedReports}
        >
          Saved reports
        </Button>
      ) : null}
    </div>
  );
}
