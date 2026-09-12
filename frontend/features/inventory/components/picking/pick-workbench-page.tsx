"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { PlusIcon } from "@animateicons/react/lucide";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FILTER_SELECT_TRIGGER,
  FILTER_TOOLBAR_ROW,
} from "@/components/ui/content-fill-panel";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { EmptyOrdersIllustration } from "@/components/illustrations";
import { STANDARD_PAGE_SIZE_OPTIONS } from "@/lib/list-pagination";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { formatShortDate } from "@/lib/date-utils";
import { useCan } from "@/hooks/api/access";
import {
  usePickWaves,
  EXCEPTION_REVIEW_KEY,
  WAVE_READ_KEY,
  WAVE_WRITE_KEY,
  type PickExceptionOwnership,
  type PickExceptionStatus,
  type PickWaveAssignment,
  type PickWaveStatus,
  type PickWaveSummary,
} from "@/hooks/api/inventory/picking";
import {
  PICK_EXCEPTION_STATUS_LABEL,
  PICK_WAVE_STATUS_BADGE,
  PICK_WAVE_STATUS_LABEL,
} from "@/features/inventory/lib/inventory-status";
import { CreateWaveDialog } from "./create-wave-dialog";
import { PickWaveSheet } from "./pick-wave-sheet";
import { PickExceptionQueue } from "./pick-exception-queue";

const ASSIGNMENTS: ReadonlyArray<{ value: PickWaveAssignment; label: string }> = [
  { value: "UNCLAIMED", label: "Available" },
  { value: "MINE", label: "Mine" },
  { value: "ANY", label: "All" },
];

const STATUSES: ReadonlyArray<PickWaveStatus> = [
  "PENDING",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
];

function isAssignment(value: string | null): value is PickWaveAssignment {
  return value === "ANY" || value === "MINE" || value === "UNCLAIMED";
}

function isStatus(value: string | null): value is PickWaveStatus {
  return STATUSES.some((status) => status === value);
}

/**
 * B5, item 5 — the supervisor queue is a view of this screen, not a second
 * route.
 *
 * A picker and the person who signs off what a picker could not do are looking at
 * two faces of one job, and splitting them across two URLs means a second nav
 * entry, a second permission row in the sidebar coverage test, and a supervisor
 * navigating away from the board to answer a question about it.
 */
type WorkbenchView = "waves" | "exceptions";

const EXCEPTION_STATUSES: ReadonlyArray<PickExceptionStatus> = ["OPEN", "RESOLVED"];

function isView(value: string | null): value is WorkbenchView {
  return value === "waves" || value === "exceptions";
}

function isExceptionStatus(value: string | null): value is PickExceptionStatus {
  return EXCEPTION_STATUSES.some((status) => status === value);
}

function isOwnership(value: string | null): value is PickExceptionOwnership {
  return value === "ANY" || value === "MINE";
}

function progressLabel(wave: PickWaveSummary): string {
  return `${wave.linesClosed}/${wave.lineCount}`;
}

/**
 * B5. Why a wave that looks finished is not.
 *
 * `linesClosed` now counts a damaged or substituted line only once a reviewer has
 * signed it, so a wave can sit at 3/4 with nobody walking. Saying so on the row is
 * the difference between "the picker is slow" and "this is on a supervisor's desk".
 */
function blockedLabel(wave: PickWaveSummary): string | null {
  if (wave.openExceptions === 0) return null;
  return `${wave.openExceptions} to review`;
}

/**
 * B4, item 5 — the picking surface is a wave board, not a sales-order table.
 *
 * `/inventory/operations/picking` used to render the RESERVED sales-order queue:
 * a list of documents somebody might pick, with no way to start, claim or finish
 * a walk, and no call to any wave endpoint at all. This is the queue a picker
 * actually works — available walks, the ones they hold, and the tasks inside
 * one — and every row opens onto the shelf-level detail rather than onto an
 * order.
 */
export function PickWorkbenchPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session } = useSession();

  const canView = useCan(WAVE_READ_KEY);
  const canPick = useCan(WAVE_WRITE_KEY);
  const canReview = useCan(EXCEPTION_REVIEW_KEY);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [createOpen, setCreateOpen] = useState(false);
  const [openWaveId, setOpenWaveId] = useState<number | null>(null);

  const assignmentParam = searchParams.get("assignment");
  const statusParam = searchParams.get("status");
  const viewParam = searchParams.get("view");
  const ownershipParam = searchParams.get("ownership");
  const assignment: PickWaveAssignment = isAssignment(assignmentParam)
    ? assignmentParam
    : "UNCLAIMED";
  const status: PickWaveStatus | undefined = isStatus(statusParam) ? statusParam : undefined;
  // A view nobody may open falls back to the board rather than rendering an
  // access-denied dead end somebody arrived at through a shared link.
  const view: WorkbenchView = isView(viewParam) && canReview ? viewParam : "waves";
  const exceptionStatus: PickExceptionStatus | undefined = isExceptionStatus(statusParam)
    ? statusParam
    : undefined;
  const ownership: PickExceptionOwnership = isOwnership(ownershipParam)
    ? ownershipParam
    : "ANY";

  const waves = usePickWaves(
    { page, limit: pageSize, assignment, status },
    { enabled: canView && view === "waves" },
  );

  function syncParams(next: {
    assignment?: PickWaveAssignment;
    status?: string;
    view?: WorkbenchView;
    ownership?: PickExceptionOwnership;
  }): void {
    const params = new URLSearchParams(searchParams.toString());
    if (next.assignment) params.set("assignment", next.assignment);
    if (next.ownership) params.set("ownership", next.ownership);
    if (next.view) {
      params.set("view", next.view);
      // The two views share the word "status" and mean different vocabularies by
      // it, so switching drops the old one rather than carrying a filter the new
      // list cannot honour.
      params.delete("status");
    }
    if (next.status !== undefined) {
      if (next.status === "all") params.delete("status");
      else params.set("status", next.status);
    }
    // Every filter change resets the page, or page 4 of the old filter is an
    // empty screen the picker has to work out how to leave.
    setPage(1);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function handleAssignmentChange(value: string): void {
    if (isAssignment(value)) syncParams({ assignment: value });
  }

  function handleStatusChange(value: string): void {
    syncParams({ status: value });
  }

  function handleViewChange(value: string): void {
    if (isView(value)) syncParams({ view: value });
  }

  function handleOwnershipChange(value: string): void {
    if (isOwnership(value)) syncParams({ ownership: value });
  }

  function handleCreateOpen(): void {
    setCreateOpen(true);
  }

  function handleRetry(): void {
    void waves.refetch();
  }

  function handleRowClick(wave: PickWaveSummary): void {
    setOpenWaveId(wave.id);
  }

  function handleCreated(pickListId: number): void {
    setOpenWaveId(pickListId);
  }

  function handleSheetOpenChange(open: boolean): void {
    if (!open) setOpenWaveId(null);
  }

  const columns: DataTableColumn<PickWaveSummary>[] = [
    {
      key: "pickNumber",
      header: "Wave",
      cell: (wave) => (
        <span className="font-mono text-dense tabular-nums">{wave.pickNumber}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (wave) => (
        <Badge
          variant="outline"
          className={cn("h-4 px-1.5 py-0 text-micro", PICK_WAVE_STATUS_BADGE[wave.status])}
        >
          {PICK_WAVE_STATUS_LABEL[wave.status]}
        </Badge>
      ),
    },
    {
      key: "warehouseName",
      header: "Warehouse",
      cell: (wave) => <span className="text-sm">{wave.warehouseName ?? "—"}</span>,
      className: "hidden md:table-cell",
      headerClassName: "hidden md:table-cell",
    },
    {
      key: "orderCount",
      header: "Orders",
      cell: (wave) => (
        <span className="font-mono tabular-nums">{wave.orderCount}</span>
      ),
      className: "text-right",
      headerClassName: "text-right",
    },
    {
      key: "progress",
      header: "Picked",
      cell: (wave) => (
        <div className="flex flex-col items-end gap-0.5">
          <span className="font-mono tabular-nums">{progressLabel(wave)}</span>
          {blockedLabel(wave) ? (
            <span className="text-micro text-muted-foreground">{blockedLabel(wave)}</span>
          ) : null}
        </div>
      ),
      className: "text-right",
      headerClassName: "text-right",
    },
    {
      key: "assignedToName",
      header: "Picker",
      cell: (wave) => (
        <span className="text-sm text-muted-foreground">
          {wave.assignedToName ?? (wave.assignedTo ? "Assigned" : "Unclaimed")}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Raised",
      cell: (wave) => (
        <span className="font-mono tabular-nums">{formatShortDate(wave.createdAt)}</span>
      ),
      className: "hidden lg:table-cell",
      headerClassName: "hidden lg:table-cell",
    },
  ];

  const filters = (
    <div className={FILTER_TOOLBAR_ROW}>
      {canReview ? (
        <Tabs value={view} onValueChange={handleViewChange}>
          <TabsList>
            <TabsTrigger value="waves">Waves</TabsTrigger>
            <TabsTrigger value="exceptions">Exceptions</TabsTrigger>
          </TabsList>
        </Tabs>
      ) : null}
      {view === "waves" ? (
        <Tabs value={assignment} onValueChange={handleAssignmentChange}>
          <TabsList>
            {ASSIGNMENTS.map((option) => (
              <TabsTrigger key={option.value} value={option.value}>
                {option.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      ) : (
        <Tabs value={ownership} onValueChange={handleOwnershipChange}>
          <TabsList>
            <TabsTrigger value="MINE">Mine</TabsTrigger>
            <TabsTrigger value="ANY">All</TabsTrigger>
          </TabsList>
        </Tabs>
      )}
      {view === "waves" ? (
        <Select value={status ?? "all"} onValueChange={handleStatusChange}>
          <SelectTrigger className={FILTER_SELECT_TRIGGER} aria-label="Filter by wave status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((option) => (
              <SelectItem key={option} value={option}>
                {PICK_WAVE_STATUS_LABEL[option]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Select value={exceptionStatus ?? "all"} onValueChange={handleStatusChange}>
          <SelectTrigger
            className={FILTER_SELECT_TRIGGER}
            aria-label="Filter by exception status"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
            <SelectItem value="all">All exceptions</SelectItem>
            {EXCEPTION_STATUSES.map((option) => (
              <SelectItem key={option} value={option}>
                {PICK_EXCEPTION_STATUS_LABEL[option]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );

  if (!canView) {
    return (
      <PageWrapper title="Picking">
        <NoPermissionState permission={WAVE_READ_KEY} className="flex-1" />
      </PageWrapper>
    );
  }

  const rows = waves.data?.items ?? [];

  return (
    <PageWrapper
      title="Picking"
      subtitle={
        view === "exceptions"
          ? "Lines a picker could not close the way the wave asked."
          : waves.data
            ? `${waves.data.total} wave${waves.data.total === 1 ? "" : "s"} in this view`
            : "Waves waiting to be walked."
      }
      filters={filters}
      actions={
        canPick && view === "waves" ? (
          <AnimatedIconButton
            icon={PlusIcon}
            iconSize={16}
            iconClassName="mr-1.5"
            size="sm"
            className="w-full sm:w-auto"
            onClick={handleCreateOpen}
          >
            New wave
          </AnimatedIconButton>
        ) : undefined
      }
      noInternalScroll
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
    >
      {view === "exceptions" ? (
        <PickExceptionQueue status={exceptionStatus} ownership={ownership} />
      ) : waves.isError ? (
        <ErrorState
          className="flex-1"
          title="Couldn't load the pick queue"
          description={getErrorMessage(waves.error)}
          onRetry={handleRetry}
        />
      ) : (
        <DataTable
          data={rows}
          columns={columns}
          getRowKey={(wave) => wave.id}
          isLoading={waves.isLoading}
          onRowClick={handleRowClick}
          className="flex-1 min-h-0"
          minWidth="900px"
          mobileCard={(wave) => (
            <div className="flex min-w-0 flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-mono text-sm tabular-nums">
                  {wave.pickNumber}
                </span>
                <Badge
                  variant="outline"
                  className={cn("h-5 px-2 py-0.5 text-micro", PICK_WAVE_STATUS_BADGE[wave.status])}
                >
                  {PICK_WAVE_STATUS_LABEL[wave.status]}
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span className="truncate">
                  {wave.warehouseName ?? "No warehouse"} ·{" "}
                  {wave.assignedToName ?? (wave.assignedTo ? "Assigned" : "Unclaimed")}
                </span>
                <span className="shrink-0 font-mono tabular-nums">
                  {progressLabel(wave)} lines
                </span>
              </div>
            </div>
          )}
          emptyState={
            <InventoryEmptyState
              illustration={<EmptyOrdersIllustration />}
              title={
                assignment === "MINE" ? "You are not walking a wave" : "No waves waiting"
              }
              description={
                assignment === "MINE"
                  ? "Claim one from the Available tab to start picking."
                  : "Gather reserved orders into a wave to send a picker out once instead of four times."
              }
              compact
            />
          }
          pagination={{
            mode: "server",
            page,
            pageSize,
            total: waves.data?.total ?? 0,
            onPageChange: setPage,
            onPageSizeChange: setPageSize,
            pageSizeOptions: STANDARD_PAGE_SIZE_OPTIONS,
          }}
        />
      )}

      <CreateWaveDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={handleCreated}
      />

      <PickWaveSheet
        open={openWaveId !== null}
        onOpenChange={handleSheetOpenChange}
        pickListId={openWaveId}
        currentUserId={session?.user?.id ?? null}
        canPick={canPick}
      />
    </PageWrapper>
  );
}
