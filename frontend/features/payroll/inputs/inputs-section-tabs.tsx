"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { useCallback, useState, type ReactNode } from "react";
import {
  useAttendanceSnapshot,
  useLeaveSnapshot,
  useOvertimeSnapshot,
  useReimbursementSnapshot,
  usePayrollAdjustments,
  useApprovePayrollAdjustment,
} from "@/hooks/api/payroll/payroll-inputs";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { CursorPageControls } from "@/components/ui/cursor-page-controls";
import {
  attendanceColumns,
  leaveColumns,
  overtimeColumns,
  reimbursementColumns,
  buildAdjustmentColumns,
} from "./inputs-column-defs";

function useCursorPager() {
  const [history, setHistory] = useState<Array<string | undefined>>([undefined]);

  const previous = useCallback(() => {
    setHistory((current) =>
      current.length > 1 ? current.slice(0, -1) : current,
    );
  }, []);

  const next = useCallback((nextCursor: string | null) => {
    if (nextCursor) setHistory((current) => [...current, nextCursor]);
  }, []);

  return {
    cursor: history.at(-1),
    page: history.length,
    previous,
    next,
  };
}

const EMPTY_NO_DATA: ReactNode = (
  <EmptyState compact className="border-0 bg-transparent" title="No data" description="Build the period first." />
);
const EMPTY_NO_OT: ReactNode = (
  <EmptyState compact className="border-0 bg-transparent" title="No approved overtime" description="No overtime has been approved for this period." />
);
const EMPTY_NO_REIMB: ReactNode = (
  <EmptyState compact className="border-0 bg-transparent" title="No approved reimbursements" description="No reimbursements have been approved for this period." />
);
const EMPTY_NO_ADJ: ReactNode = (
  <EmptyState compact className="border-0 bg-transparent" title="No adjustments" description="No adjustments for this period." />
);

function AttendanceTab({ periodId }: { periodId: number }) {
  const pager = useCursorPager();
  const { data, isLoading, isFetching, isError, error, refetch } = useAttendanceSnapshot(periodId, {
    cursor: pager.cursor,
    limit: 25,
  });
  function handleRetry() {
    void refetch();
  }
  const rows = data?.data ?? [];
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {isError ? (
        <ErrorState
          className="flex-1"
          title="Couldn't load attendance inputs"
          description={getErrorMessage(error)}
          onRetry={handleRetry}
        />
      ) : (
        <DataTable
          className="flex-1 min-h-0"
          data={rows}
          columns={attendanceColumns}
          getRowKey={(row) => row.id}
          isLoading={isLoading}
          emptyState={EMPTY_NO_DATA}
        />
      )}
      {data && (pager.page > 1 || data.pagination.hasMore) ? (
        <CursorPageControls
          page={pager.page}
          hasNext={data.pagination.hasMore}
          disabled={isFetching}
          onPrevious={pager.previous}
          onNext={() => pager.next(data.pagination.nextCursor)}
        />
      ) : null}
    </div>
  );
}

function LeaveTab({ periodId }: { periodId: number }) {
  const pager = useCursorPager();
  const { data, isLoading, isFetching, isError, error, refetch } = useLeaveSnapshot(periodId, {
    cursor: pager.cursor,
    limit: 25,
  });
  function handleRetry() {
    void refetch();
  }
  const rows = data?.data ?? [];
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {isError ? (
        <ErrorState
          className="flex-1"
          title="Couldn't load leave inputs"
          description={getErrorMessage(error)}
          onRetry={handleRetry}
        />
      ) : (
        <DataTable
          className="flex-1 min-h-0"
          data={rows}
          columns={leaveColumns}
          getRowKey={(row) => row.id}
          isLoading={isLoading}
          emptyState={EMPTY_NO_DATA}
        />
      )}
      {data && (pager.page > 1 || data.pagination.hasMore) ? (
        <CursorPageControls
          page={pager.page}
          hasNext={data.pagination.hasMore}
          disabled={isFetching}
          onPrevious={pager.previous}
          onNext={() => pager.next(data.pagination.nextCursor)}
        />
      ) : null}
    </div>
  );
}

function OvertimeTab({ periodId }: { periodId: number }) {
  const pager = useCursorPager();
  const { data, isLoading, isFetching, isError, error, refetch } = useOvertimeSnapshot(periodId, {
    cursor: pager.cursor,
    limit: 25,
  });
  function handleRetry() {
    void refetch();
  }
  const rows = data?.data ?? [];
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {isError ? (
        <ErrorState
          className="flex-1"
          title="Couldn't load overtime inputs"
          description={getErrorMessage(error)}
          onRetry={handleRetry}
        />
      ) : (
        <DataTable
          className="flex-1 min-h-0"
          data={rows}
          columns={overtimeColumns}
          getRowKey={(row) => row.id}
          isLoading={isLoading}
          emptyState={EMPTY_NO_OT}
        />
      )}
      {data && (pager.page > 1 || data.pagination.hasMore) ? (
        <CursorPageControls
          page={pager.page}
          hasNext={data.pagination.hasMore}
          disabled={isFetching}
          onPrevious={pager.previous}
          onNext={() => pager.next(data.pagination.nextCursor)}
        />
      ) : null}
    </div>
  );
}

function ReimbursementsTab({ periodId }: { periodId: number }) {
  const pager = useCursorPager();
  const { data, isLoading, isFetching, isError, error, refetch } = useReimbursementSnapshot(periodId, {
    cursor: pager.cursor,
    limit: 25,
  });
  function handleRetry() {
    void refetch();
  }
  const rows = data?.data ?? [];
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {isError ? (
        <ErrorState
          className="flex-1"
          title="Couldn't load reimbursement inputs"
          description={getErrorMessage(error)}
          onRetry={handleRetry}
        />
      ) : (
        <DataTable
          className="flex-1 min-h-0"
          data={rows}
          columns={reimbursementColumns}
          getRowKey={(row) => row.id}
          isLoading={isLoading}
          emptyState={EMPTY_NO_REIMB}
        />
      )}
      {data && (pager.page > 1 || data.pagination.hasMore) ? (
        <CursorPageControls
          page={pager.page}
          hasNext={data.pagination.hasMore}
          disabled={isFetching}
          onPrevious={pager.previous}
          onNext={() => pager.next(data.pagination.nextCursor)}
        />
      ) : null}
    </div>
  );
}

function AdjustmentsTab({ periodId, isLocked }: { periodId: number; isLocked: boolean }) {
  const pager = useCursorPager();
  const { data, isLoading, isFetching, isError, error, refetch } = usePayrollAdjustments(periodId, {
    cursor: pager.cursor,
    limit: 25,
  });
  function handleRetry() {
    void refetch();
  }
  const approve = useApprovePayrollAdjustment();
  const rows = data?.data ?? [];
  const columns = buildAdjustmentColumns(isLocked, {
    isPending: approve.isPending,
    mutate: (id) => approve.mutate(id),
  });
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {isError ? (
        <ErrorState
          className="flex-1"
          title="Couldn't load adjustments"
          description={getErrorMessage(error)}
          onRetry={handleRetry}
        />
      ) : (
        <DataTable
          className="flex-1 min-h-0"
          data={rows}
          columns={columns}
          getRowKey={(row) => row.id}
          isLoading={isLoading}
          emptyState={EMPTY_NO_ADJ}
        />
      )}
      {data && (pager.page > 1 || data.pagination.hasMore) ? (
        <CursorPageControls
          page={pager.page}
          hasNext={data.pagination.hasMore}
          disabled={isFetching}
          onPrevious={pager.previous}
          onNext={() => pager.next(data.pagination.nextCursor)}
        />
      ) : null}
    </div>
  );
}

interface InputsSectionTabsProps {
  periodId: number;
  isLocked: boolean;
  onCreateAdjustment: () => void;
}

export function InputsSectionTabs({ periodId, isLocked, onCreateAdjustment }: InputsSectionTabsProps) {
  return (
    <Tabs defaultValue="attendance" className="flex flex-1 min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between mb-3">
        <TabsList>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="leave">Leave</TabsTrigger>
          <TabsTrigger value="overtime">Overtime</TabsTrigger>
          <TabsTrigger value="reimbursements">Reimbursements</TabsTrigger>
          <TabsTrigger value="adjustments">Adjustments</TabsTrigger>
        </TabsList>
        {!isLocked && (
          <AnimatedIconButton icon={PlusIcon} iconClassName="mr-1.5" variant="outline" size="sm" className="text-xs" onClick={onCreateAdjustment}>
            Add Adjustment
          </AnimatedIconButton>
        )}
      </div>
      <TabsContent value="attendance" className="mt-0 flex flex-1 min-h-0 flex-col">
        <AttendanceTab periodId={periodId} />
      </TabsContent>
      <TabsContent value="leave" className="mt-0 flex flex-1 min-h-0 flex-col">
        <LeaveTab periodId={periodId} />
      </TabsContent>
      <TabsContent value="overtime" className="mt-0 flex flex-1 min-h-0 flex-col">
        <OvertimeTab periodId={periodId} />
      </TabsContent>
      <TabsContent value="reimbursements" className="mt-0 flex flex-1 min-h-0 flex-col">
        <ReimbursementsTab periodId={periodId} />
      </TabsContent>
      <TabsContent value="adjustments" className="mt-0 flex flex-1 min-h-0 flex-col">
        <AdjustmentsTab periodId={periodId} isLocked={isLocked} />
      </TabsContent>
    </Tabs>
  );
}
