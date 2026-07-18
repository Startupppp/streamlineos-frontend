"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { useState, type ReactNode } from "react";
import { getUserDisplayName } from "@/features/projects/shared/resolve-user-name";
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
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(p.totalAmount ?? 0);
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
  pending: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  approved: "bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-300 dark:border-green-500/30",
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
  <p className="text-center text-muted-foreground text-sm py-6">No data — build the period first</p>
);
const EMPTY_NO_OT: ReactNode = (
  <p className="text-center text-muted-foreground text-sm py-6">No approved overtime this period</p>
);
const EMPTY_NO_REIMB: ReactNode = (
  <p className="text-center text-muted-foreground text-sm py-6">No approved reimbursements this period</p>
);
const EMPTY_NO_ADJ: ReactNode = (
  <p className="text-center text-muted-foreground text-sm py-6">No adjustments for this period</p>
);

function AttendanceTab({ periodId }: { periodId: number }) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useAttendanceSnapshot(periodId, { page, limit: 25 });
  const rows = data?.data ?? [];
  return (
    <DataTable
      data={rows}
      columns={attendanceColumns}
      getRowKey={(row) => row.id}
      isLoading={isLoading}
      emptyState={EMPTY_NO_DATA}
      pagination={{
        mode: "server",
        page,
        pageSize: 25,
        total: data?.pagination.total ?? 0,
        onPageChange: setPage,
      }}
    />
  );
}

function LeaveTab({ periodId }: { periodId: number }) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useLeaveSnapshot(periodId, { page, limit: 25 });
  const rows = data?.data ?? [];
  return (
    <DataTable
      data={rows}
      columns={leaveColumns}
      getRowKey={(row) => row.id}
      isLoading={isLoading}
      emptyState={EMPTY_NO_DATA}
      pagination={{
        mode: "server",
        page,
        pageSize: 25,
        total: data?.pagination.total ?? 0,
        onPageChange: setPage,
      }}
    />
  );
}

function OvertimeTab({ periodId }: { periodId: number }) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useOvertimeSnapshot(periodId, { page, limit: 25 });
  const rows = data?.data ?? [];
  return (
    <DataTable
      data={rows}
      columns={overtimeColumns}
      getRowKey={(row) => row.id}
      isLoading={isLoading}
      emptyState={EMPTY_NO_OT}
      pagination={{
        mode: "server",
        page,
        pageSize: 25,
        total: data?.pagination.total ?? 0,
        onPageChange: setPage,
      }}
    />
  );
}

function ReimbursementsTab({ periodId }: { periodId: number }) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useReimbursementSnapshot(periodId, { page, limit: 25 });
  const rows = data?.data ?? [];
  return (
    <DataTable
      data={rows}
      columns={reimbursementColumns}
      getRowKey={(row) => row.id}
      isLoading={isLoading}
      emptyState={EMPTY_NO_REIMB}
      pagination={{
        mode: "server",
        page,
        pageSize: 25,
        total: data?.pagination.total ?? 0,
        onPageChange: setPage,
      }}
    />
  );
}

function AdjustmentsTab({ periodId, isLocked }: { periodId: number; isLocked: boolean }) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = usePayrollAdjustments(periodId, { page, limit: 25 });
  const approve = useApprovePayrollAdjustment();
  const rows = data?.data ?? [];
  const columns = buildAdjustmentColumns(isLocked, {
    isPending: approve.isPending,
    mutate: (id) => approve.mutate(id),
  });
  return (
    <DataTable
      data={rows}
      columns={columns}
      getRowKey={(row) => row.id}
      isLoading={isLoading}
      emptyState={EMPTY_NO_ADJ}
      pagination={{
        mode: "server",
        page,
        pageSize: 25,
        total: data?.pagination.total ?? 0,
        onPageChange: setPage,
      }}
    />
  );
}

interface InputsSectionTabsProps {
  periodId: number;
  isLocked: boolean;
  onCreateAdjustment: () => void;
}

export function InputsSectionTabs({ periodId, isLocked, onCreateAdjustment }: InputsSectionTabsProps) {
  return (
    <Tabs defaultValue="attendance">
      <div className="flex items-center justify-between mb-3">
        <TabsList className="text-xs">
          <TabsTrigger value="attendance" className="text-xs">Attendance</TabsTrigger>
          <TabsTrigger value="leave" className="text-xs">Leave</TabsTrigger>
          <TabsTrigger value="overtime" className="text-xs">Overtime</TabsTrigger>
          <TabsTrigger value="reimbursements" className="text-xs">Reimbursements</TabsTrigger>
          <TabsTrigger value="adjustments" className="text-xs">Adjustments</TabsTrigger>
        </TabsList>
        {!isLocked && (
          <AnimatedIconButton icon={PlusIcon} iconClassName="mr-1.5" variant="outline" size="sm" className="text-xs" onClick={onCreateAdjustment}>
            Add Adjustment
          </AnimatedIconButton>
        )}
      </div>
      <TabsContent value="attendance" className="mt-0">
        <AttendanceTab periodId={periodId} />
      </TabsContent>
      <TabsContent value="leave" className="mt-0">
        <LeaveTab periodId={periodId} />
      </TabsContent>
      <TabsContent value="overtime" className="mt-0">
        <OvertimeTab periodId={periodId} />
      </TabsContent>
      <TabsContent value="reimbursements" className="mt-0">
        <ReimbursementsTab periodId={periodId} />
      </TabsContent>
      <TabsContent value="adjustments" className="mt-0">
        <AdjustmentsTab periodId={periodId} isLocked={isLocked} />
      </TabsContent>
    </Tabs>
  );
}
