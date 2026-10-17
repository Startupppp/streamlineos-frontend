"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { Gauge, MessageSquareHeart, Minus, ThumbsDown, ThumbsUp } from "lucide-react";
import { PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { SemanticBadge } from "@/components/ui/semantic-badge";
import { StatCard, StatCardGrid, StatCardGridSkeleton } from "@/components/ui/stat-card";
import { useCan } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import type { NpsSurveyStatus } from "@/hooks/api/crm/nps";
import {
  useDeleteNpsSurvey,
  useNpsStats,
  useNpsSurveys,
  useUpdateNpsSurvey,
} from "@/hooks/api/crm/nps-surveys";
import type { NpsSurvey } from "@/hooks/api/crm/nps-surveys-schema";
import { formatShortDate } from "@/lib/date-utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { NpsResponsesSheet } from "./nps-responses-sheet";
import { NpsSurveyDialog } from "./nps-survey-dialog";
import { NpsSurveyRowActions } from "./nps-survey-row-actions";
import { surveyStatusBadge } from "./nps-survey-status";

const HEADERS = ["Survey", "Status", "Responses", "NPS", "Created", ""];
const STATUS_TOAST: Record<NpsSurveyStatus, string> = {
  draft: "Survey moved to draft",
  active: "Survey activated. Its link now accepts responses",
  closed: "Survey closed. Its link no longer accepts responses",
};

function surveyKey(survey: NpsSurvey) {
  return survey.id;
}

/** Net Promoter surveys: the list, their scores, and the links customers answer. */
export function NpsSurveysPage() {
  const surveys = useNpsSurveys();
  const stats = useNpsStats();
  const canManage = useCan("crm:clients:manage");
  const update = useUpdateNpsSurvey();
  const remove = useDeleteNpsSurvey();
  // `undefined` = dialog closed, `null` = creating, a survey = editing it.
  const [formTarget, setFormTarget] = useState<NpsSurvey | null | undefined>(undefined);
  const [responsesTarget, setResponsesTarget] = useState<NpsSurvey | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<NpsSurvey | null>(null);

  const rows = useMemo(() => surveys.data ?? [], [surveys.data]);
  const pageState = usePageState({
    permission: "crm:clients:read",
    isLoading: surveys.isLoading,
    isError: surveys.isError,
    error: surveys.error,
    isEmpty: surveys.data !== undefined && rows.length === 0,
  });

  const handleCreate = useCallback(() => setFormTarget(null), []);
  const handleCloseForm = useCallback(() => setFormTarget(undefined), []);
  const handleCloseResponses = useCallback(() => setResponsesTarget(null), []);
  const handleDeleteOpenChange = useCallback((open: boolean) => {
    if (!open) setDeleteTarget(null);
  }, []);
  const handleSetStatus = useCallback(
    (survey: NpsSurvey, status: NpsSurveyStatus) =>
      update.mutate(
        { surveyId: survey.id, status },
        {
          onSuccess: () => toast.success(STATUS_TOAST[status]),
          onError: (error) => toast.error(getErrorMessage(error)),
        },
      ),
    [update],
  );
  const handleDelete = useCallback(() => {
    if (!deleteTarget) return;
    remove.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Survey deleted");
        setDeleteTarget(null);
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }, [deleteTarget, remove]);
  const handleRetry = useCallback(() => void surveys.refetch(), [surveys]);

  const columns = useMemo<DataTableColumn<NpsSurvey>[]>(
    () => [
      {
        key: "title",
        header: "Survey",
        cell: (row) => (
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="font-medium">{row.title}</span>
            <span className="truncate text-sm text-muted-foreground">{row.question}</span>
          </div>
        ),
      },
      {
        key: "status",
        header: "Status",
        cell: (row) => <SemanticBadge size="xs" {...surveyStatusBadge(row.status)} />,
      },
      {
        key: "responses",
        header: "Responses",
        cell: (row) => <span className="font-mono tabular-nums">{row.responseCount}</span>,
      },
      {
        key: "nps",
        header: "NPS",
        cell: (row) => (
          <span className="font-mono tabular-nums">{row.responseCount ? row.nps : "—"}</span>
        ),
      },
      {
        key: "createdAt",
        header: "Created",
        cell: (row) => <span className="tabular-nums">{formatShortDate(row.createdAt)}</span>,
      },
      {
        key: "actions",
        header: "",
        headerClassName: "w-12",
        cell: (row) => (
          <NpsSurveyRowActions
            survey={row}
            canManage={canManage}
            onViewResponses={setResponsesTarget}
            onEdit={setFormTarget}
            onSetStatus={handleSetStatus}
            onDelete={setDeleteTarget}
          />
        ),
      },
    ],
    [canManage, handleSetStatus],
  );

  return (
    <PageWrapper
      title="NPS surveys"
      subtitle="Ask customers how likely they are to recommend you, and track the score."
      state={pageState}
      onRetry={handleRetry}
      loading={
        <div className="flex min-h-0 flex-1 flex-col gap-gap-section">
          <StatCardGridSkeleton count={5} cols={5} />
          <DataTableSkeleton rows={8} headers={HEADERS} className="flex-1" />
        </div>
      }
      empty={
        <EmptyState
          title="No NPS surveys yet"
          description="Create a survey, activate it, and share its link. Every answer lands here with its score."
          action={canManage ? { label: "New survey", onClick: handleCreate } : undefined}
          className={CONTENT_FILL_PANEL}
        />
      }
      actions={
        canManage ? (
          <AnimatedIconButton icon={PlusIcon} iconSize={16} iconClassName="mr-1.5" size="sm" onClick={handleCreate}>
            New survey
          </AnimatedIconButton>
        ) : undefined
      }
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-gap-section">
        {stats.isLoading ? (
          <StatCardGridSkeleton count={5} cols={5} />
        ) : stats.data ? (
          <StatCardGrid cols={5}>
            <StatCard
              label="NPS (active surveys)"
              value={stats.data.breakdown.total ? stats.data.nps : "—"}
              icon={Gauge}
              tone="blue"
            />
            <StatCard label="Active surveys" value={stats.data.activeSurveys} icon={MessageSquareHeart} />
            <StatCard label="Promoters" value={stats.data.breakdown.promoters} icon={ThumbsUp} tone="emerald" />
            <StatCard label="Passives" value={stats.data.breakdown.passives} icon={Minus} tone="amber" />
            <StatCard label="Detractors" value={stats.data.breakdown.detractors} icon={ThumbsDown} tone="red" />
          </StatCardGrid>
        ) : null}

        <DataTable
          data={rows}
          columns={columns}
          getRowKey={surveyKey}
          pagination={{ pageSize: 25 }}
          minWidth="760px"
          className="min-h-0 flex-1"
        />
      </div>

      {formTarget !== undefined ? (
        <NpsSurveyDialog key={formTarget?.id ?? "new"} survey={formTarget} onClose={handleCloseForm} />
      ) : null}
      <NpsResponsesSheet survey={responsesTarget} onClose={handleCloseResponses} />
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={handleDeleteOpenChange}
        title="Delete this survey?"
        description={
          deleteTarget
            ? `${deleteTarget.title} and its ${deleteTarget.responseCount} responses will be deleted, and its link will stop working. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete survey"
        destructive
        isPending={remove.isPending}
        onConfirm={handleDelete}
      />
    </PageWrapper>
  );
}
