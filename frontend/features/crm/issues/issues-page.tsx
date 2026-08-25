"use client";

import { useState } from "react";
import { PlusIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { Button } from "@/components/ui/button";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CONTENT_FILL_PANEL,
  FILTER_TOOLBAR_ROW,
  FILTER_SELECT_TRIGGER,
} from "@/components/ui/content-fill-panel";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import { RecordList } from "@/features/renderer";
import { DensityToggle, useDensity } from "@/features/renderer/density-toggle";
import { useCan } from "@/hooks/api/access";
import { useIssueRecordTypes, useIssues } from "@/hooks/api/crm/issues";
import { cn } from "@/lib/utils";
import {
  ISSUE_SEVERITIES,
  ISSUE_STAGES,
  STAGE_LABELS,
  type IssueRecord,
  type IssueRecordType,
  type IssueSeverity,
  type IssueStage,
} from "@/types/crm/issues";
import { IssueDetailSheet } from "./issue-detail-sheet";
import { IssueFormDialog } from "./issue-form-dialog";

const PAGE_SIZE = 25;

const SEVERITY_LABELS: Record<IssueSeverity, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

function RaiseButton({ label, onClick }: { label: string; onClick: () => void }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <Button onClick={onClick} {...hoverHandlers}>
      <PlusIcon ref={iconRef} size={14} /> {label}
    </Button>
  );
}

/**
 * Issues, tasks and complaints.
 *
 * One surface for three record types, and no list, table or form is written
 * here. The server sends three layout descriptions; the record-type control
 * picks one and the renderer produces its columns, its labels, its empty state,
 * its mobile card, its detail view and its form from that. A fourth record type
 * would be a server change and nothing else — which is the entire reason the
 * engine exists.
 *
 * What is hand-written is what a description cannot express: which filters this
 * domain has, what a caller is permitted to do to a row, and the stage ledger.
 */
export function IssuesPage() {
  const canManage = useCan("crm:issues:manage");
  const canEscalate = useCan("crm:issues:escalate");

  const [recordType, setRecordType] = useState<IssueRecordType>("issue");
  const [stage, setStage] = useState<IssueStage | "all">("all");
  const [severity, setSeverity] = useState<IssueSeverity | "all">("all");
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [openRecordId, setOpenRecordId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<IssueRecord | null>(null);
  const [density, setDensity] = useDensity();

  const types = useIssueRecordTypes();
  const records = useIssues({
    recordType,
    limit: PAGE_SIZE,
    cursor,
    ...(stage === "all" ? {} : { stage }),
    ...(severity === "all" ? {} : { severity }),
  });

  /**
   * The description the server sent for the selected type.
   *
   * Preferred from the page over the record-types call, so a list and its rows
   * can never be one deploy apart: every read carries the layout it was
   * projected against.
   */
  const layout =
    records.data?.layout ??
    types.data?.recordTypes.find((candidate) => candidate.recordType === recordType);

  function resetPaging() {
    setCursor(undefined);
  }

  function handleRecordTypeChange(value: string) {
    const next = types.data?.recordTypes.find((candidate) => candidate.recordType === value);
    if (!next) return;
    setRecordType(next.recordType);
    resetPaging();
  }

  function handleStageChange(value: string) {
    const next = ISSUE_STAGES.find((candidate) => candidate === value);
    setStage(next ?? "all");
    resetPaging();
  }

  function handleSeverityChange(value: string) {
    const next = ISSUE_SEVERITIES.find((candidate) => candidate === value);
    setSeverity(next ?? "all");
    resetPaging();
  }

  function handleNextPage() {
    const next = records.data?.pagination.nextCursor;
    if (next) setCursor(next);
  }

  function handleOpenCreate() {
    setCreateOpen(true);
  }

  function handleEditRequest(record: IssueRecord) {
    setOpenRecordId(null);
    setEditTarget(record);
  }

  function handleEditDialogChange(open: boolean) {
    if (!open) setEditTarget(null);
  }

  function handleDetailOpenChange(open: boolean) {
    if (!open) setOpenRecordId(null);
  }

  if (types.isLoading)
    return (
      <PageWrapper title="Issues">
        <DataTableSkeleton rows={12} columns={5} className="flex-1" />
      </PageWrapper>
    );

  if (types.isError || !layout)
    return (
      <PageWrapper title="Issues">
        <ErrorState
          className={CONTENT_FILL_PANEL}
          title="Couldn't load the record types"
          onRetry={() => void types.refetch()}
        />
      </PageWrapper>
    );

  const rows = records.data?.data ?? [];
  const hasMore = records.data?.pagination.hasMore ?? false;
  const isFiltered = stage !== "all" || severity !== "all";
  const plural = layout.plural.toLowerCase();

  const filtersBar = (
    <div className={FILTER_TOOLBAR_ROW}>
      <Select value={recordType} onValueChange={handleRecordTypeChange}>
        <SelectTrigger
          className={cn("w-fit min-w-[9rem]", FILTER_SELECT_TRIGGER)}
          aria-label="Record type"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
          {types.data?.recordTypes.map((candidate) => (
            <SelectItem key={candidate.recordType} value={candidate.recordType}>
              {candidate.plural}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={stage} onValueChange={handleStageChange}>
        <SelectTrigger
          className={cn("w-fit min-w-[9rem]", FILTER_SELECT_TRIGGER)}
          aria-label="Stage"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
          {/* The sentinel removes the filter rather than sending "all". */}
          <SelectItem value="all">All stages</SelectItem>
          {ISSUE_STAGES.map((candidate) => (
            <SelectItem key={candidate} value={candidate}>
              {STAGE_LABELS[candidate]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={severity} onValueChange={handleSeverityChange}>
        <SelectTrigger
          className={cn("w-fit min-w-[9rem]", FILTER_SELECT_TRIGGER)}
          aria-label="Severity"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
          <SelectItem value="all">All severities</SelectItem>
          {ISSUE_SEVERITIES.map((candidate) => (
            <SelectItem key={candidate} value={candidate}>
              {SEVERITY_LABELS[candidate]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <DensityToggle density={density} onChange={setDensity} />
    </div>
  );

  return (
    <PageWrapper
      title={layout.plural}
      subtitle="What went wrong, what has to be done, and what a customer told you."
      filters={filtersBar}
      actions={
        canManage ? (
          <RaiseButton label={`New ${layout.singular.toLowerCase()}`} onClick={handleOpenCreate} />
        ) : undefined
      }
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-hidden">
        {records.isLoading ? (
          <DataTableSkeleton
            rows={12}
            columns={layout.list.columns.length}
            className="flex-1"
          />
        ) : records.isError ? (
          <ErrorState
            className={CONTENT_FILL_PANEL}
            title={`Couldn't load ${plural}`}
            onRetry={() => void records.refetch()}
          />
        ) : rows.length === 0 ? (
          <EmptyState
            className={CONTENT_FILL_PANEL}
            title={isFiltered ? `No matching ${plural}` : `No ${plural} yet`}
            description={
              isFiltered
                ? "Try a different stage or severity."
                : `${layout.plural} raised by your team, or by the system on their behalf, will appear here.`
            }
            action={
              isFiltered || !canManage
                ? undefined
                : { label: `New ${layout.singular.toLowerCase()}`, onClick: handleOpenCreate }
            }
          />
        ) : (
          <>
            <RecordList
              layout={layout}
              rows={rows}
              getRowKey={(row) => String(row.issueRecordId)}
              onRowClick={(row) => setOpenRecordId(String(row.issueRecordId))}
              density={density}
              minWidth="760px"
              className={CONTENT_FILL_PANEL}
            />
            {hasMore ? (
              <div className="flex shrink-0 justify-end px-1">
                <Button variant="outline" size="sm" onClick={handleNextPage}>
                  Load more
                </Button>
              </div>
            ) : null}
          </>
        )}
      </div>

      {createOpen ? (
        <IssueFormDialog open={createOpen} onOpenChange={setCreateOpen} layout={layout} />
      ) : null}

      {editTarget ? (
        <IssueFormDialog
          open={!!editTarget}
          onOpenChange={handleEditDialogChange}
          layout={layout}
          record={editTarget}
        />
      ) : null}

      <IssueDetailSheet
        issueRecordId={openRecordId}
        onOpenChange={handleDetailOpenChange}
        onEdit={handleEditRequest}
        canManage={canManage}
        canEscalate={canEscalate}
      />
    </PageWrapper>
  );
}
