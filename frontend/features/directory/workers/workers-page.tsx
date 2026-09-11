"use client";

import { useCallback, useState } from "react";
import { useWorkersFilters } from "./use-workers-filters";
import { PlusIcon, EllipsisIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { useWorkers } from "@/hooks/api/directory/workers";
import { useCan } from "@/hooks/api/access";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table";

import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { CursorPageControls } from "@/components/ui/cursor-page-controls";
import { SearchInput } from "@/components/ui/search-input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SemanticBadge } from "@/components/ui/semantic-badge";
import type { BadgeTone } from "@/components/ui/semantic-badge";
import { WorkerFormDialog } from "./worker-form-dialog";
import { WorkerEngagementsSheet } from "./worker-engagements-sheet";
import type { Worker, WorkerStatus } from "@/types/directory/workers";
import { CONTENT_FILL_PANEL, FILTER_TOOLBAR_ROW, FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { TABLE_TITLE_CELL, TEXT_ONE_LINE } from "@/lib/text-overflow";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

const STATUS_OPTIONS: { value: WorkerStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "All statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "EXITED", label: "Exited" },
];

const STATUS_TONE: Record<WorkerStatus, BadgeTone> = {
  ACTIVE: "success",
  INACTIVE: "neutral",
  EXITED: "danger",
};

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

function workerDisplayName(worker: Worker): string {
  if (worker.displayName) return worker.displayName;
  const full = `${worker.firstName} ${worker.lastName}`.trim();
  if (full) return full;
  return worker.workerNumber ?? "Unnamed worker";
}

function AddWorkerButton({ onClick }: { onClick: () => void }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <Button onClick={onClick} {...hoverHandlers}>
      <PlusIcon ref={iconRef} size={14} /> Add Worker
    </Button>
  );
}

function WorkerRowActions({
  worker,
  canManage,
  onManageEngagements,
}: {
  worker: Worker;
  canManage: boolean;
  onManageEngagements: (w: Worker) => void;
}) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();

  const handleManageEngagements = useCallback(
    () => onManageEngagements(worker),
    [worker, onManageEngagements],
  );

  if (!canManage) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="w-7"
          aria-label="Worker actions"
          {...hoverHandlers}
        >
          <EllipsisIcon ref={iconRef} size={14} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleManageEngagements}>
          Manage engagements
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function WorkersPage() {
  const canManage = useCan("directory:workers:manage");

  const {
    localSearch,
    search,
    status,
    cursor,
    page,
    hasHistory,
    setSearch,
    setStatus,
    pushCursor,
    popCursor,
  } = useWorkersFilters();

  const [createOpen, setCreateOpen] = useState(false);
  const [engagementsTarget, setEngagementsTarget] = useState<Worker | null>(null);

  const { data, isLoading, isError, refetch } = useWorkers({
    cursor,
    limit: PAGE_SIZE,
    search: search || undefined,
    status: status === "ALL" ? undefined : status,
  });

  const rows = data?.data ?? [];
  const pageInfo = data?.pageInfo;
  const isFiltered = !!search.trim() || status !== "ALL";

  function handleSearchChange(value: string) {
    setSearch(value);
  }

  function handleStatusChange(value: string) {
    setStatus(value as WorkerStatus | "ALL");
  }

  function handleClearFilters() {
    setSearch("");
    setStatus("ALL");
  }

  function handleOpenCreate() {
    setCreateOpen(true);
  }

  function handleCreateDialogChange(open: boolean) {
    setCreateOpen(open);
  }

  function handleEngagementsSheetChange(open: boolean) {
    if (!open) setEngagementsTarget(null);
  }

  function handleNext() {
    if (pageInfo?.nextCursor) pushCursor(pageInfo.nextCursor);
  }

  function handleRetry() {
    void refetch();
  }

  const handleManageEngagements = useCallback((worker: Worker) => {
    setEngagementsTarget(worker);
  }, []);

  const columns: DataTableColumn<Worker>[] = [
    {
      key: "name",
      header: "Worker",
      className: TABLE_TITLE_CELL,
      cell: (row) => (
        <div className="flex min-w-0 flex-col">
          <span
            className={cn("font-medium text-foreground", TEXT_ONE_LINE)}
            title={workerDisplayName(row)}
          >
            {workerDisplayName(row)}
          </span>
          {row.workEmail && (
            <span className={cn("text-xs text-muted-foreground", TEXT_ONE_LINE)}>
              {row.workEmail}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "workerNumber",
      header: "Number",
      className: "min-w-[100px]",
      cell: (row) => (
        <span className="text-sm text-muted-foreground tabular-nums">
          {row.workerNumber ?? "—"}
        </span>
      ),
    },
    {
      key: "isPayee",
      header: "Payee",
      className: "min-w-[80px]",
      cell: (row) =>
        row.isPayee ? (
          <SemanticBadge tone="info" label="Payee" size="xs" />
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      className: "min-w-[90px]",
      cell: (row) => (
        <SemanticBadge
          tone={STATUS_TONE[row.status]}
          label={row.status.charAt(0) + row.status.slice(1).toLowerCase()}
          size="xs"
        />
      ),
    },
    {
      key: "createdAt",
      header: "Added",
      className: "w-32 shrink-0",
      cell: (row) => (
        <span className="text-sm text-muted-foreground tabular-nums">
          {formatDate(row.createdAt)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-10",
      cell: (row) => (
        <WorkerRowActions
          worker={row}
          canManage={canManage}
          onManageEngagements={handleManageEngagements}
        />
      ),
    },
  ];

  const filtersBar = (
    <div className={FILTER_TOOLBAR_ROW}>
      <SearchInput
        placeholder="Search workers…"
        value={localSearch}
        onValueChange={handleSearchChange}
      />
      <Select value={status} onValueChange={handleStatusChange}>
        <SelectTrigger
          size="sm"
          className={cn(FILTER_SELECT_TRIGGER, "w-[130px]")}
          aria-label="Filter by status"
        >
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
          {STATUS_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <PageWrapper
      title="Workforce"
      subtitle="Workers and engagements"
      filters={filtersBar}
      actions={canManage ? <AddWorkerButton onClick={handleOpenCreate} /> : undefined}
    >
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col">
          {isLoading ? (
            <DataTableSkeleton rows={12} columns={6} className="flex-1" />
          ) : isError ? (
            <ErrorState className={CONTENT_FILL_PANEL} onRetry={handleRetry} />
          ) : rows.length === 0 ? (
            <EmptyState
              className={CONTENT_FILL_PANEL}
              illustrationPreset="team"
              title="No workers yet"
              description={isFiltered ? "No results match your filters." : "Add workers to build your workforce directory."}
              filtersActive={isFiltered}
              onClearFilters={handleClearFilters}
              action={!isFiltered && canManage ? { label: "Add Worker", onClick: handleOpenCreate } : undefined}
            />
          ) : (
            <>
              <DataTable
                data={rows}
                columns={columns}
                getRowKey={(row) => row.workerId}
                minWidth="640px"
                className={CONTENT_FILL_PANEL}
              />
              {hasHistory || pageInfo?.hasMore ? (
                <CursorPageControls
                  page={page}
                  hasNext={pageInfo?.hasMore ?? false}
                  onPrevious={popCursor}
                  onNext={handleNext}
                  className="mt-2"
                />
              ) : null}
            </>
          )}
        </div>
      </div>

      {createOpen && (
        <WorkerFormDialog
          open={createOpen}
          onOpenChange={handleCreateDialogChange}
        />
      )}

      {engagementsTarget && (
        <WorkerEngagementsSheet
          open={!!engagementsTarget}
          onOpenChange={handleEngagementsSheetChange}
          worker={engagementsTarget}
        />
      )}
    </PageWrapper>
  );
}
