"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { useCallback, useState, type ReactNode } from "react";
import { getUserDisplayName } from "@/lib/person-display";
import { formatCurrencyFull } from "@/lib/format-utils";
import { SourceRefsPopover } from "./source-refs-popover";
import {
  useAttendanceSnapshot,
  useLeaveSnapshot,
  useOvertimeSnapshot,
  useReimbursementSnapshot,
  usePayrollAdjustments,
  useApprovePayrollAdjustment,
  type PayrollInputSnapshot,
  type PayrollAdjustment,
} from "@/hooks/api/payroll/payroll-inputs";
import { LoadingButton } from "@/components/ui/loading-button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { CursorPageControls } from "@/components/ui/cursor-page-controls";

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

function resolveDisplayName(row: PayrollInputSnapshot | PayrollAdjustment): string {
  return getUserDisplayName({
    name: row.userName,
    firstName: row.userFirstName,
    lastName: row.userLastName,
    email: row.userEmail,
  });
}

const attendanceColumns: DataTableColumn<PayrollInputSnapshot>[] = [
  {
    key: "employee",
    header: "Employee",
    cell: (row) => <span className="font-medium">{resolveDisplayName(row)}</span>,
  },
  {
    key: "payableDays",
    header: "Payable",
    headerClassName: "text-right",
    className: "text-right",
    cell: (row) => {
      const p = row.payload as { payableDays?: number };
      return p.payableDays ?? 0;
    },
  },
  {
    key: "presentDays",
    header: "Present",
    headerClassName: "text-right",
    className: "text-right",
    cell: (row) => {
      const p = row.payload as { presentDays?: number };
      return p.presentDays ?? 0;
    },
  },
  {
    key: "absentDays",
    header: "Absent",
    headerClassName: "text-right",
    className: "text-right",
    cell: (row) => {
      const p = row.payload as { absentDays?: number };
      return p.absentDays ?? 0;
    },
  },
  {
    key: "lateCount",
    header: "Late",
    headerClassName: "text-right",
    className: "text-right",
    cell: (row) => {
      const p = row.payload as { lateCount?: number };
      return p.lateCount ?? 0;
    },
  },
  {
    key: "overtimeMinutes",
    header: "OT (min)",
    headerClassName: "text-right",
    className: "text-right",
    cell: (row) => {
      const p = row.payload as { overtimeMinutes?: number };
      return p.overtimeMinutes ?? 0;
    },
  },
  {
    key: "refs",
    header: "",
    className: "w-6",
    cell: (row) => <SourceRefsPopover refs={row.sourceRefs} />,
  },
];

const leaveColumns: DataTableColumn<PayrollInputSnapshot>[] = [
  {
    key: "employee",
    header: "Employee",
    cell: (row) => <span className="font-medium">{resolveDisplayName(row)}</span>,
  },
  {
    key: "paidLeaveDays",
    header: "Paid Leave",
    headerClassName: "text-right",
    className: "text-right",
    cell: (row) => {
      const p = row.payload as { paidLeaveDays?: number };
      return p.paidLeaveDays ?? 0;
    },
  },
  {
    key: "unpaidLeaveDays",
    header: "Unpaid",
    headerClassName: "text-right",
    className: "text-right",
    cell: (row) => {
      const p = row.payload as { unpaidLeaveDays?: number };
      return p.unpaidLeaveDays ?? 0;
    },
  },
  {
    key: "halfDayCount",
    header: "Half Days",
    headerClassName: "text-right",
    className: "text-right",
    cell: (row) => {
      const p = row.payload as { halfDayCount?: number };
      return p.halfDayCount ?? 0;
    },
  },
  {
    key: "encashmentDays",
    header: "Encashment",
    headerClassName: "text-right",
    className: "text-right",
    cell: (row) => {
      const p = row.payload as { encashmentDays?: number };
      return p.encashmentDays ?? 0;
    },
  },
  {
    key: "refs",
    header: "",
    className: "w-6",
    cell: (row) => <SourceRefsPopover refs={row.sourceRefs} />,
  },
];

const overtimeColumns: DataTableColumn<PayrollInputSnapshot>[] = [
  {
    key: "employee",
    header: "Employee",
    cell: (row) => <span className="font-medium">{resolveDisplayName(row)}</span>,
  },
  {
    key: "approvedRequests",
    header: "Approved Requests",
    headerClassName: "text-right",
    className: "text-right",
    cell: (row) => {
      const p = row.payload as { approvedRequests?: unknown[] };
      return p.approvedRequests?.length ?? 0;
    },
  },
  {
    key: "totalHours",
    header: "Total Hours",
    headerClassName: "text-right",
    className: "text-right",
    cell: (row) => {
      const p = row.payload as { totalHours?: number };
      return `${(p.totalHours ?? 0).toFixed(1)}h`;
    },
  },
  {
    key: "refs",
    header: "",
    className: "w-6",
    cell: (row) => <SourceRefsPopover refs={row.sourceRefs} />,
  },
];

const reimbursementColumns: DataTableColumn<PayrollInputSnapshot>[] = [
  {
    key: "employee",
    header: "Employee",
    cell: (row) => <span className="font-medium">{resolveDisplayName(row)}</span>,
  },
  {
    key: "claims",
    header: "Claims",
    headerClassName: "text-right",
    className: "text-right",
    cell: (row) => {
      const p = row.payload as { items?: unknown[] };
      return p.items?.length ?? 0;
    },
  },
  {
    key: "totalAmount",
    header: "Total Amount",
    headerClassName: "text-right",
    className: "text-right",
    cell: (row) => {
      const p = row.payload as { totalAmount?: number };
      return formatCurrencyFull(p.totalAmount ?? 0, "INR", "en-IN", 0);
    },
  },
  {
    key: "refs",
    header: "",
    className: "w-6",
    cell: (row) => <SourceRefsPopover refs={row.sourceRefs} />,
  },
];

const ADJ_STATUS_STYLES: Record<string, string> = {
  pending: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
  approved: "bg-status-success-surface text-status-success-ink border-status-success-rule",
  applied: "bg-primary/10 text-foreground border-primary/20",
};

function buildAdjustmentColumns(
  isLocked: boolean,
  approve: { isPending: boolean; mutate: (id: number) => void },
): DataTableColumn<PayrollAdjustment>[] {
  const cols: DataTableColumn<PayrollAdjustment>[] = [
    {
      key: "employee",
      header: "Employee",
      cell: (row) => <span className="font-medium">{resolveDisplayName(row)}</span>,
    },
    {
      key: "adjustmentType",
      header: "Type",
      className: "capitalize",
      cell: (row) => row.adjustmentType,
    },
    {
      key: "section",
      header: "Section",
      className: "capitalize",
      cell: (row) => row.section.replace(/_/g, " "),
    },
    {
      key: "reason",
      header: "Reason",
      className: "max-w-48 truncate",
      cell: (row) => row.reason,
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <Badge variant="outline" className={ADJ_STATUS_STYLES[row.status] ?? ""}>
          {row.status}
        </Badge>
      ),
    },
  ];

  if (!isLocked) {
    cols.push({
      key: "actions",
      header: "",
      cell: (row) =>
        row.status === "pending" ? (
          <LoadingButton
            variant="outline"
            size="sm"
            isPending={approve.isPending}
            onClick={() => approve.mutate(row.id)}
          >
            Approve
          </LoadingButton>
        ) : null,
    });
  }

  return cols;
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
  const { data, isLoading, isFetching } = useAttendanceSnapshot(periodId, {
    cursor: pager.cursor,
    limit: 25,
  });
  const rows = data?.data ?? [];
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <DataTable
        className="flex-1 min-h-0"
        data={rows}
        columns={attendanceColumns}
        getRowKey={(row) => row.id}
        isLoading={isLoading}
        emptyState={EMPTY_NO_DATA}
      />
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
  const { data, isLoading, isFetching } = useLeaveSnapshot(periodId, {
    cursor: pager.cursor,
    limit: 25,
  });
  const rows = data?.data ?? [];
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <DataTable
        className="flex-1 min-h-0"
        data={rows}
        columns={leaveColumns}
        getRowKey={(row) => row.id}
        isLoading={isLoading}
        emptyState={EMPTY_NO_DATA}
      />
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
  const { data, isLoading, isFetching } = useOvertimeSnapshot(periodId, {
    cursor: pager.cursor,
    limit: 25,
  });
  const rows = data?.data ?? [];
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <DataTable
        className="flex-1 min-h-0"
        data={rows}
        columns={overtimeColumns}
        getRowKey={(row) => row.id}
        isLoading={isLoading}
        emptyState={EMPTY_NO_OT}
      />
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
  const { data, isLoading, isFetching } = useReimbursementSnapshot(periodId, {
    cursor: pager.cursor,
    limit: 25,
  });
  const rows = data?.data ?? [];
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <DataTable
        className="flex-1 min-h-0"
        data={rows}
        columns={reimbursementColumns}
        getRowKey={(row) => row.id}
        isLoading={isLoading}
        emptyState={EMPTY_NO_REIMB}
      />
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
  const { data, isLoading, isFetching } = usePayrollAdjustments(periodId, {
    cursor: pager.cursor,
    limit: 25,
  });
  const approve = useApprovePayrollAdjustment();
  const rows = data?.data ?? [];
  const columns = buildAdjustmentColumns(isLocked, {
    isPending: approve.isPending,
    mutate: (id) => approve.mutate(id),
  });
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <DataTable
        className="flex-1 min-h-0"
        data={rows}
        columns={columns}
        getRowKey={(row) => row.id}
        isLoading={isLoading}
        emptyState={EMPTY_NO_ADJ}
      />
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
