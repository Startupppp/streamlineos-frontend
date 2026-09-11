"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { PlusIcon } from "@animateicons/react/lucide";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { DataTable } from "@/components/ui/data-table";
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
import { EmptyWarehouseIllustration } from "@/components/illustrations";
import { STANDARD_PAGE_SIZE_OPTIONS } from "@/lib/list-pagination";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import {
  usePutawayTasks,
  PUTAWAY_READ_KEY,
  PUTAWAY_WRITE_KEY,
  type PutawayAssignment,
  type PutawayTaskStatus,
  type PutawayTaskSummary,
} from "@/hooks/api/inventory/putaway";
import { PUTAWAY_TASK_STATUS_LABEL } from "@/features/inventory/lib/inventory-status";
import { RaisePutawayDialog } from "./raise-putaway-dialog";
import { PutawayTaskSheet } from "./putaway-task-sheet";
import { buildPutawayTaskColumns, renderPutawayTaskMobileCard } from "./putaway-task-columns";

const ASSIGNMENTS: ReadonlyArray<{ value: PutawayAssignment; label: string }> = [
  { value: "UNCLAIMED", label: "Available" },
  { value: "MINE", label: "Mine" },
  { value: "ANY", label: "All" },
];

const STATUSES: ReadonlyArray<PutawayTaskStatus> = [
  "PENDING",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
];

function isAssignment(value: string | null): value is PutawayAssignment {
  return value === "ANY" || value === "MINE" || value === "UNCLAIMED";
}

function isStatus(value: string | null): value is PutawayTaskStatus {
  return STATUSES.includes(value as PutawayTaskStatus);
}

/**
 * B3, item 3 — the putaway queue.
 *
 * A goods receipt lands every accepted unit on one location, and until this
 * screen existed nothing recorded that anybody had taken them anywhere: the
 * suggestion endpoint could say where they ought to go, and the answer went to
 * nobody. This is the queue an operator actually works — tasks waiting, the ones
 * they hold, and the lines inside one — and every row opens onto the shelf-level
 * detail rather than onto a receipt.
 */
export function PutawayWorkbenchPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session } = useSession();

  const canView = useCan(PUTAWAY_READ_KEY);
  const canPutAway = useCan(PUTAWAY_WRITE_KEY);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [raiseOpen, setRaiseOpen] = useState(false);
  const [openTaskId, setOpenTaskId] = useState<number | null>(null);

  const assignmentParam = searchParams.get("assignment");
  const statusParam = searchParams.get("status");
  const assignment: PutawayAssignment = isAssignment(assignmentParam)
    ? assignmentParam
    : "UNCLAIMED";
  const status: PutawayTaskStatus | undefined = isStatus(statusParam) ? statusParam : undefined;

  const tasks = usePutawayTasks(
    { page, limit: pageSize, assignment, status },
    { enabled: canView },
  );

  function syncParams(next: { assignment?: PutawayAssignment; status?: string }): void {
    const params = new URLSearchParams(searchParams.toString());
    if (next.assignment) params.set("assignment", next.assignment);
    if (next.status !== undefined) {
      if (next.status === "all") params.delete("status");
      else params.set("status", next.status);
    }
    // Every filter change resets the page, or page 4 of the old filter is an
    // empty screen the operator has to work out how to leave.
    setPage(1);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function handleAssignmentChange(value: string): void {
    if (isAssignment(value)) syncParams({ assignment: value });
  }

  function handleStatusChange(value: string): void {
    syncParams({ status: value });
  }

  function handleRaiseOpen(): void {
    setRaiseOpen(true);
  }

  function handleRetry(): void {
    void tasks.refetch();
  }

  function handleRowClick(task: PutawayTaskSummary): void {
    setOpenTaskId(task.id);
  }

  function handleRaised(taskId: number): void {
    setOpenTaskId(taskId);
  }

  function handleSheetOpenChange(open: boolean): void {
    if (!open) setOpenTaskId(null);
  }

  const columns = buildPutawayTaskColumns();

  const filters = (
    <div className={FILTER_TOOLBAR_ROW}>
      <Tabs value={assignment} onValueChange={handleAssignmentChange}>
        <TabsList>
          {ASSIGNMENTS.map((option) => (
            <TabsTrigger key={option.value} value={option.value}>
              {option.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <Select value={status ?? "all"} onValueChange={handleStatusChange}>
        <SelectTrigger className={FILTER_SELECT_TRIGGER} aria-label="Filter by task status">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
          <SelectItem value="all">All statuses</SelectItem>
          {STATUSES.map((option) => (
            <SelectItem key={option} value={option}>
              {PUTAWAY_TASK_STATUS_LABEL[option]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  if (!canView) {
    return (
      <PageWrapper title="Putaway">
        <NoPermissionState permission={PUTAWAY_READ_KEY} className="flex-1" />
      </PageWrapper>
    );
  }

  const rows = tasks.data?.items ?? [];

  return (
    <PageWrapper
      title="Putaway"
      subtitle={
        tasks.data
          ? `${tasks.data.total} task${tasks.data.total === 1 ? "" : "s"} in this view`
          : "Deliveries waiting to move from the dock to the shelves."
      }
      filters={filters}
      actions={
        canPutAway ? (
          <AnimatedIconButton
            icon={PlusIcon}
            iconSize={16}
            iconClassName="mr-1.5"
            size="sm"
            className="w-full sm:w-auto"
            onClick={handleRaiseOpen}
          >
            Raise putaway
          </AnimatedIconButton>
        ) : undefined
      }
      noInternalScroll
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
    >
      {tasks.isError ? (
        <ErrorState
          className="flex-1"
          title="Couldn't load the putaway queue"
          description={getErrorMessage(tasks.error)}
          onRetry={handleRetry}
        />
      ) : (
        <DataTable
          data={rows}
          columns={columns}
          getRowKey={(task) => task.id}
          isLoading={tasks.isLoading}
          onRowClick={handleRowClick}
          className="flex-1 min-h-0"
          minWidth="900px"
          mobileCard={renderPutawayTaskMobileCard}
          emptyState={
            <InventoryEmptyState
              illustration={<EmptyWarehouseIllustration />}
              title={
                assignment === "MINE" ? "You are not walking a putaway" : "Nothing on the dock"
              }
              description={
                assignment === "MINE"
                  ? "Claim one from the Available tab to start putting stock away."
                  : "Raise a putaway from a posted receipt to move it off the receiving bin."
              }
              compact
            />
          }
          pagination={{
            mode: "server",
            page,
            pageSize,
            total: tasks.data?.total ?? 0,
            onPageChange: setPage,
            onPageSizeChange: setPageSize,
            pageSizeOptions: STANDARD_PAGE_SIZE_OPTIONS,
          }}
        />
      )}

      <RaisePutawayDialog
        open={raiseOpen}
        onOpenChange={setRaiseOpen}
        onCreated={handleRaised}
      />

      <PutawayTaskSheet
        open={openTaskId !== null}
        onOpenChange={handleSheetOpenChange}
        taskId={openTaskId}
        currentUserId={session?.user?.id ?? null}
        canPutAway={canPutAway}
      />
    </PageWrapper>
  );
}
