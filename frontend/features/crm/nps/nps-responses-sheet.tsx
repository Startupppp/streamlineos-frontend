"use client";

import { useCallback, useMemo } from "react";
import { AppSheet } from "@/components/shared/app-sheet";
import { ErrorState } from "@/components/shared/error-state";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { SemanticBadge, type BadgeTone } from "@/components/ui/semantic-badge";
import { StatCard, StatCardGrid, StatCardGridSkeleton } from "@/components/ui/stat-card";
import { useNpsSurvey } from "@/hooks/api/crm/nps-surveys";
import type { NpsResponse, NpsSurvey } from "@/hooks/api/crm/nps-surveys-schema";
import { formatShortDate } from "@/lib/date-utils";

const CATEGORY_TONE: Record<string, BadgeTone> = {
  promoter: "success",
  passive: "warning",
  detractor: "danger",
};

const HEADERS = ["Score", "Category", "Comment", "Respondent", "Received"];

const COLUMNS: DataTableColumn<NpsResponse>[] = [
  {
    key: "score",
    header: "Score",
    cell: (row) => <span className="font-mono tabular-nums">{row.score}</span>,
  },
  {
    key: "category",
    header: "Category",
    cell: (row) => (
      <SemanticBadge
        size="xs"
        tone={CATEGORY_TONE[row.category] ?? "neutral"}
        label={row.category.charAt(0).toUpperCase() + row.category.slice(1)}
      />
    ),
  },
  {
    key: "comment",
    header: "Comment",
    cell: (row) => <span className="text-sm">{row.comment || "—"}</span>,
  },
  {
    key: "respondent",
    header: "Respondent",
    cell: (row) => (
      <span className="text-sm">{row.respondentName || row.respondentEmail || "Anonymous"}</span>
    ),
  },
  {
    key: "createdAt",
    header: "Received",
    cell: (row) => <span className="tabular-nums">{formatShortDate(row.createdAt)}</span>,
  },
];

function responseKey(row: NpsResponse) {
  return row.id;
}

interface NpsResponsesSheetProps {
  /** The survey whose responses are open; `null` closes the sheet. */
  survey: NpsSurvey | null;
  onClose: () => void;
}

export function NpsResponsesSheet({ survey, onClose }: NpsResponsesSheetProps) {
  const detail = useNpsSurvey(survey?.id ?? null);
  const responses = useMemo(() => detail.data?.responses ?? [], [detail.data]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) onClose();
    },
    [onClose],
  );
  const handleRetry = useCallback(() => void detail.refetch(), [detail]);

  return (
    <AppSheet
      open={survey !== null}
      onOpenChange={handleOpenChange}
      title={survey ? `${survey.title}: responses` : "Responses"}
      description={survey?.question}
      className="sm:max-w-2xl"
    >
      {detail.isLoading ? (
        <div className="flex flex-col gap-gap-section">
          <StatCardGridSkeleton count={4} />
          <DataTableSkeleton rows={6} headers={HEADERS} />
        </div>
      ) : detail.isError ? (
        <ErrorState
          title="Couldn't load the responses"
          description="The survey's responses didn't load. Check your connection and try again."
          onRetry={handleRetry}
        />
      ) : detail.data ? (
        <div className="flex flex-col gap-gap-section">
          <StatCardGrid cols={4}>
            <StatCard label="NPS" value={detail.data.breakdown.total ? detail.data.nps : "—"} />
            <StatCard label="Promoters" value={detail.data.breakdown.promoters} tone="emerald" />
            <StatCard label="Passives" value={detail.data.breakdown.passives} tone="amber" />
            <StatCard label="Detractors" value={detail.data.breakdown.detractors} tone="red" />
          </StatCardGrid>
          {/* The server returns at most the 500 most recent responses. */}
          <DataTable
            data={responses}
            columns={COLUMNS}
            getRowKey={responseKey}
            pagination={{ pageSize: 20 }}
            minWidth="640px"
            emptyState={
              <EmptyState
                compact
                title="No responses yet"
                description="Responses appear here as people answer the survey through its link."
              />
            }
          />
        </div>
      ) : null}
    </AppSheet>
  );
}
