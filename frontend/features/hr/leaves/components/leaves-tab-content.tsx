"use client";

import { useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { format, differenceInCalendarDays } from "date-fns";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Download, History } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";

const LeaveBalanceDonut = dynamic(
  () => import("./leave-balance-donut").then((m) => ({ default: m.LeaveBalanceDonut })),
  { ssr: false, loading: () => <Skeleton className="h-[190px] w-full rounded-2xl" /> },
);

import type { LeaveBalance, LeaveRequest, ApprovedLeave } from "./leaves-shared";
import { BalanceCard, balanceCardConfig, DEFAULT_CARD_CONFIG, priorityConfig } from "./leaves-shared";
import { LeaveCalendarWidget } from "./leave-calendar-widget";
import { RequestActionCell } from "./leave-request-action-cell";
import { useCancelLeave, useApproveLeaveDedicated, useRejectLeaveDedicated, useRevertLeave } from "@/hooks/api/hr";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import { useLeavePolicy } from "@/hooks/api/hr";
import { TruncatedText } from "@/components/ui/truncated-text";

interface LeavesTabContentProps {
  balances: LeaveBalance[];
  myLeaveRequests: LeaveRequest[];
  approvedLeavesThisWeek?: ApprovedLeave[];
  compact?: boolean;
}

export function LeavesTabContent({
  balances,
  myLeaveRequests,
  approvedLeavesThisWeek = [],
  compact = false,
}: LeavesTabContentProps) {
  const isAdmin = useCan("hr:employees:manage");
  const { data: policy } = useLeavePolicy();
  const allowedLeaveTypeNames = useMemo(
    () => new Set(policy?.leaveTypes.map((t) => t.name) ?? []),
    [policy],
  );

  const currentYear = new Date().getFullYear();

  const approveMutation = useApproveLeaveDedicated();
  const rejectMutation = useRejectLeaveDedicated();
  const revertMutation = useRevertLeave();
  const cancelMutation = useCancelLeave();

  const handleApproveRequest = useCallback(
    (id: number) => {
      approveMutation.mutate(
        { leaveId: id },
        {
          onSuccess: () => toast.success("Leave request approved"),
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [approveMutation],
  );

  const handleRejectRequest = useCallback(
    (id: number, reason?: string) => {
      rejectMutation.mutate(
        { leaveId: id, reason: reason ?? "" },
        {
          onSuccess: () => toast.success("Leave request rejected"),
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [rejectMutation],
  );

  const handleRevertRequest = useCallback(
    (id: number) => {
      revertMutation.mutate(id, {
        onSuccess: () => toast.success("Leave request reverted to pending"),
        onError: (err) => toast.error(getErrorMessage(err)),
      });
    },
    [revertMutation],
  );

  const handleCancelRequest = useCallback(
    (id: number) => {
      cancelMutation.mutate(id, {
        onSuccess: () => toast.success("Leave request cancelled"),
        onError: (err) => toast.error(getErrorMessage(err)),
      });
    },
    [cancelMutation],
  );

  const handleExportExcel = useCallback(async () => {
    if (myLeaveRequests.length === 0) {
      toast.error("No leave requests to export");
      return;
    }
    try {
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      const ws = workbook.addWorksheet("Leave Requests");
      ws.columns = [
        { header: "Type", width: 15 },
        { header: "From", width: 14 },
        { header: "To", width: 14 },
        { header: "Priority", width: 10 },
        { header: "Status", width: 12 },
        { header: "Reason", width: 30 },
        { header: "Requested On", width: 14 },
      ];
      ws.getRow(1).font = { bold: true };
      for (const req of myLeaveRequests) {
        ws.addRow([
          req.leaveType?.name || "-",
          req.startDate,
          req.endDate,
          req.priority || "Medium",
          req.status,
          req.reason || "-",
          req.createdAt ? format(new Date(req.createdAt), "yyyy-MM-dd") : "-",
        ]);
      }
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `leave-requests-${format(new Date(), "yyyy-MM-dd")}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Leave requests exported!");
    } catch {
      toast.error("Failed to export");
    }
  }, [myLeaveRequests]);

  const columns = useMemo<DataTableColumn<LeaveRequest>[]>(
    () => [
      {
        key: "type",
        header: "Type",
        cell: (row) => {
          const typeName = row.leaveType?.name ?? "Leave";
          const config = balanceCardConfig[typeName] ?? DEFAULT_CARD_CONFIG;
          const Icon = config.icon;
          return (
            <div className="flex items-center gap-2.5">
              <div
                className={cn(
                  "h-8 w-7 rounded-lg flex items-center justify-center",
                  config.iconBg,
                )}
              >
                <Icon
                  className={cn("h-3.5 w-3.5", config.iconColor)}
                  aria-hidden="true"
                />
              </div>
              <div className="min-w-0">
                <TruncatedText text={typeName.replace(" Leave", "")} className="text-sm font-semibold text-foreground leading-tight" />
                <p className="text-[10px] text-muted-foreground">Leave</p>
              </div>
            </div>
          );
        },
      },
      {
        key: "dateRequested",
        header: "Date Requested",
        cell: (row) => {
          const createdAt = row.createdAt
            ? new Date(row.createdAt)
            : new Date(row.startDate);
          return (
            <span className="text-xs text-muted-foreground tabular-nums">
              {format(createdAt, "MMM d, yyyy")}
            </span>
          );
        },
        className: "hidden md:table-cell",
        headerClassName: "hidden md:table-cell",
      },
      {
        key: "period",
        header: "Period",
        cell: (row) => {
          const start = new Date(row.startDate);
          const end = new Date(row.endDate);
          const days = differenceInCalendarDays(end, start) + 1;
          const periodStr =
            days === 1
              ? format(start, "MMM d")
              : `${format(start, "MMM d")} – ${format(end, "MMM d")}`;
          return (
            <span className="text-xs text-foreground font-medium">
              {periodStr}
            </span>
          );
        },
      },
      {
        key: "days",
        header: "Days",
        cell: (row) => {
          const start = new Date(row.startDate);
          const end = new Date(row.endDate);
          const days = differenceInCalendarDays(end, start) + 1;
          return (
            <span className="text-xs text-center font-semibold tabular-nums text-foreground">
              {days}
            </span>
          );
        },
      },
      {
        key: "priority",
        header: "Priority",
        cell: (row) => {
          const priority = row.priority ?? "MEDIUM";
          const pConfig =
            priorityConfig[priority] ??
            priorityConfig["MEDIUM"] ?? {
              label: "Medium",
              dotColor: "bg-amber-500",
              textColor: "text-amber-600",
            };
          return (
            <div className="flex items-center gap-1.5">
              <span className={cn("h-1.5 w-1.5 rounded-full", pConfig.dotColor)} />
              <span className={cn("text-[10px] font-semibold", pConfig.textColor)}>
                {pConfig.label}
              </span>
            </div>
          );
        },
        className: "hidden md:table-cell",
        headerClassName: "hidden md:table-cell",
      },
      {
        key: "status",
        header: "Status",
        cell: (row) => {
          const status = row.status ?? "PENDING";
          const statusBadgeClass =
            status === "PENDING"
              ? "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-800"
              : status === "APPROVED"
                ? "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-800"
                : status === "CANCELLED"
                  ? "bg-muted text-muted-foreground border-border"
                  : "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-800";
          return (
            <div className="flex flex-col gap-0.5">
              <span
                className={cn(
                  "inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border w-fit",
                  statusBadgeClass,
                )}
              >
                {status.charAt(0) + status.slice(1).toLowerCase()}
              </span>
              {row.managerComment && (
                <TruncatedText text={`"${row.managerComment}"`} className="text-[10px] text-muted-foreground max-w-[120px]" />
              )}
              {status === "REJECTED" && row.rejectionReason && (
                <span
                  className="text-[10px] text-rose-500 dark:text-rose-300 truncate max-w-[120px]"
                  title={row.rejectionReason}
                >
                  {row.rejectionReason}
                </span>
              )}
            </div>
          );
        },
      },
      {
        key: "action",
        header: "Action",
        cell: (row) => (
          <div className="flex justify-end">
            <RequestActionCell
              request={row}
              isAdmin={isAdmin}
              isSelf
              onApprove={handleApproveRequest}
              onReject={handleRejectRequest}
              onRevert={handleRevertRequest}
              onCancel={handleCancelRequest}
            />
          </div>
        ),
        headerClassName: "text-right",
      },
    ],
    [isAdmin, handleApproveRequest, handleRejectRequest, handleRevertRequest, handleCancelRequest],
  );

  return (
    <div className={compact ? "flex min-h-0 flex-1 flex-col gap-3" : "space-y-4"}>
      {!compact && (
        <>
          <div className="space-y-0.5">
            <h2 className="text-sm font-semibold text-foreground">Overview</h2>
            <p className="text-xs text-muted-foreground">
              Your leave balances and history for {currentYear}.
            </p>
          </div>

          <div
            className="grid gap-3 grid-cols-2 lg:grid-cols-3"
            role="list"
            aria-label="Leave balances"
          >
            {balances
              .filter(
                (bal) => bal.typeName && allowedLeaveTypeNames.has(bal.typeName),
              )
              .map((bal, index) => (
                <BalanceCard
                  key={`${bal.leaveTypeId}-${index}`}
                  typeName={bal.typeName}
                  balance={bal.balance}
                  daysPerYear={bal.daysPerYear}
                />
              ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <LeaveBalanceDonut balances={balances} allowedNames={allowedLeaveTypeNames} />
            <LeaveCalendarWidget approvedLeaves={approvedLeavesThisWeek} />
          </div>
        </>
      )}

      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border">
        <CardHeader className="shrink-0 border-b pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <div className="w-7 rounded-lg bg-muted flex items-center justify-center">
                <History
                  className="h-3.5 w-3.5 text-muted-foreground"
                  aria-hidden="true"
                />
              </div>
              Request History
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExportExcel}
              className="gap-1.5 text-xs text-muted-foreground shrink-0"
              aria-label="Export to Excel"
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent className="min-h-0 flex-1 overflow-auto pt-0" aria-live="polite">
          <DataTable
            data={myLeaveRequests}
            columns={columns}
            getRowKey={(row) => row.id}
            minWidth="600px"
            emptyState={
              <EmptyState
                illustrationPreset="default"
                title="No leave requests"
                description="You haven't submitted any leave requests yet."
                className="flex-1 border-0 bg-transparent"
              />
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
