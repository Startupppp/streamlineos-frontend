"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { DownloadIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { getErrorMessage } from "@/lib/get-error-message";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { NoPermissionState } from "@/components/shared/no-permission-state";
import { useSurveyResponses, useExportResponses, type SurveyResponseSession } from "@/hooks/api/surveys/analytics";
import { ResponseDetailSheet } from "./response-detail-sheet";

export function ResponseTable({ surveyId }: { surveyId: number }) {
  const responsesQuery = useSurveyResponses(surveyId, { pageSize: 100 });
  const { data: responses, isError, error, refetch } = responsesQuery;
  const isLoading = responsesQuery.isLoading || responsesQuery.access.pending;
  const exportResponses = useExportResponses(surveyId);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);

  const columns: DataTableColumn<SurveyResponseSession>[] = useMemo(
    () => [
      { key: "id", header: "Respondent", cell: (row) => (row.anonymous ? "Anonymous" : `Participant ${row.participantId ?? row.id}`) },
      { key: "status", header: "Status", cell: (row) => <Badge variant={row.status === "submitted" ? "default" : "secondary"}>{row.status}</Badge> },
      { key: "submittedAt", header: "Submitted at", cell: (row) => (row.submittedAt ? new Date(row.submittedAt).toLocaleString() : "—") },
      { key: "score", header: "Score", cell: (row) => row.score ?? "—" },
      { key: "segment", header: "Segment", cell: (row) => row.segment ?? "—" },
    ],
    [],
  );

  async function handleExport() {
    try {
      const blob = await exportResponses.mutateAsync(undefined);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `survey-${surveyId}-responses.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  function handleRetry() {
    void refetch();
  }

  function handleRowClick(row: SurveyResponseSession) {
    setSelectedSessionId(row.id);
  }

  function handleDetailOpenChange(open: boolean) {
    if (!open) setSelectedSessionId(null);
  }

  if (responsesQuery.access.denied)
    return <NoPermissionState permission="surveys:responses:view" compact />;

  if (isError)
    return <ErrorState title="Couldn't load responses" description={getErrorMessage(error)} onRetry={handleRetry} />;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <AnimatedIconButton icon={DownloadIcon} iconSize={14} iconClassName="mr-1.5" variant="outline" size="sm" onClick={handleExport} disabled={exportResponses.isPending}>
          Export CSV
        </AnimatedIconButton>
      </div>
      <DataTable
        data={responses ?? []}
        columns={columns}
        getRowKey={(row) => row.id}
        isLoading={isLoading}
        onRowClick={handleRowClick}
        emptyState={
          <EmptyState
            compact
            title="No responses yet"
            description="Responses appear here as people complete this survey."
          />
        }
      />
      <ResponseDetailSheet
        surveyId={surveyId}
        sessionId={selectedSessionId}
        open={selectedSessionId !== null}
        onOpenChange={handleDetailOpenChange}
      />
    </div>
  );
}
