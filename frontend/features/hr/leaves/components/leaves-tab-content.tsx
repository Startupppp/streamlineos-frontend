"use client";

import React, { useCallback, useMemo, useState } from "react";
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isWithinInterval,
  differenceInCalendarDays,
} from "date-fns";
import { toast } from "sonner";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyLeaveIllustration } from "@/components/illustrations";
import {
  Filter,
  Download,
  CalendarDays,
  TrendingUp,
  History,
  MoreVertical,
  Eye,
  Check,
  X,
  RotateCcw,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useCancelLeave, useApproveLeaveDedicated, useRejectLeaveDedicated, useRevertLeave } from "@/hooks/api/hr";
import { cn, resolveImageUrl } from "@/lib/utils";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";

import type {
  LeaveBalance,
  LeaveRequest,
  ApprovedLeave,
} from "./leaves-shared";
import { BalanceCard, balanceCardConfig, DEFAULT_CARD_CONFIG, priorityConfig } from "./leaves-shared";
import { useCan } from "@/hooks/api/access";
import { useLeavePolicy } from "@/hooks/api/hr";

const DONUT_COLORS = ["#06b6d4", "#3b82f6", "#ef4444", "#10b981", "#8b5cf6"];

function LeaveBalanceDonut({ balances, allowedNames }: { balances: LeaveBalance[]; allowedNames: Set<string> }) {
  const data = useMemo(
    () =>
      balances
        .filter(
          (b) =>
            b.typeName &&
            (allowedNames.size === 0 || allowedNames.has(b.typeName)) &&
            (b.daysPerYear ?? 0) > 0,
        )
        .map((b) => ({
          name: b.typeName!,
          remaining: Math.max(0, parseFloat(b.balance || "0")),
          used: Math.max(
            0,
            (b.daysPerYear ?? 0) - parseFloat(b.balance || "0"),
          ),
          total: b.daysPerYear ?? 0,
        })),
    [balances, allowedNames],
  );

  if (data.length === 0) return null;

  const chartData = data.flatMap((d, i) => [
    {
      name: `${d.name} (used)`,
      value: d.used,
      color: DONUT_COLORS[i % DONUT_COLORS.length],
      opacity: 0.3,
    },
    {
      name: `${d.name} (remaining)`,
      value: d.remaining,
      color: DONUT_COLORS[i % DONUT_COLORS.length],
      opacity: 1,
    },
  ]);

  return (
    <Card className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center">
            <TrendingUp
              className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400"
              aria-hidden="true"
            />
          </div>
          Balance Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center gap-4">
          <div className="h-[120px] w-[120px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={52}
                  paddingAngle={1}
                  dataKey="value"
                >
                  {chartData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.color}
                      fillOpacity={entry.opacity}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ fontSize: 11 }}
                  formatter={(value, name) => [`${value} days`, String(name)]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2.5 flex-1 min-w-0">
            {data.map((item, i) => (
              <div key={item.name} className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{
                        backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length],
                      }}
                    />
                    <span className="text-[11px] font-medium text-muted-foreground truncate">
                      {item.name}
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-foreground shrink-0 tabular-nums">
                    {item.remaining}/{item.total}
                  </span>
                </div>
                <div className="h-1 rounded-full bg-muted overflow-hidden ml-3.5">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${item.total > 0 ? (item.remaining / item.total) * 100 : 0}%`,
                      backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length],
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LeaveCalendarWidget({
  approvedLeaves,
}: {
  approvedLeaves: ApprovedLeave[];
}) {
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const leavesPerDay = useMemo(
    () =>
      days.map((day) => ({
        day,
        leaves: approvedLeaves.filter((leave) => {
          const start = new Date(leave.startDate);
          const end = new Date(leave.endDate);
          return isWithinInterval(day, { start, end });
        }),
      })),
    [approvedLeaves, days],
  );

  const hasAnyLeave = leavesPerDay.some((d) => d.leaves.length > 0);
  if (!hasAnyLeave) return null;

  const todayStr = format(today, "yyyy-MM-dd");

  return (
    <Card className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center">
            <CalendarDays
              className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400"
              aria-hidden="true"
            />
          </div>
          Who&apos;s Out This Week
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-7 gap-1">
          {leavesPerDay.map(({ day, leaves }) => {
            const isToday = format(day, "yyyy-MM-dd") === todayStr;
            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "rounded-lg p-1.5 min-h-[64px] flex flex-col transition-colors duration-200",
                  isToday
                    ? "bg-blue-500/10 border border-blue-500/30"
                    : "bg-muted/30 border border-transparent",
                )}
              >
                <div
                  className={cn(
                    "text-[10px] font-medium text-center leading-tight mb-1",
                    isToday
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-muted-foreground",
                  )}
                >
                  {format(day, "EEE")}
                  <br />
                  <span className={cn("text-[11px]", isToday && "font-bold")}>
                    {format(day, "d")}
                  </span>
                </div>
                <div className="flex flex-wrap gap-0.5 justify-center">
                  {leaves.slice(0, 3).map((l) => (
                    <Avatar
                      key={l.id}
                      className="h-5 w-5"
                      title={`${l.user?.firstName} ${l.user?.lastName}`}
                    >
                      <AvatarImage src={resolveImageUrl(l.user?.image)} />
                      <AvatarFallback className="text-[8px] bg-amber-100 text-amber-700">
                        {l.user?.firstName?.[0]}
                        {l.user?.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  {leaves.length > 3 && (
                    <span className="text-[9px] text-muted-foreground self-end">
                      +{leaves.length - 3}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

interface RequestActionCellProps {
  request: LeaveRequest;
  isAdmin: boolean;
  isSelf: boolean;
  onApprove?: (id: number) => void;
  onReject?: (id: number, reason?: string) => void;
  onRevert?: (id: number) => void;
  onCancel?: (id: number) => void;
}

function RequestActionCell({
  request,
  isAdmin,
  isSelf,
  onApprove,
  onReject,
  onRevert,
  onCancel,
}: RequestActionCellProps) {
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const status = request.status ?? "PENDING";

  function handleOpenRejectDialog() {
    setRejectReason("");
    setRejectDialogOpen(true);
  }

  function handleCloseRejectDialog() {
    setRejectDialogOpen(false);
  }

  function handleConfirmReject() {
    setRejectDialogOpen(false);
    onReject?.(request.id, rejectReason || undefined);
  }

  function handleRejectReasonChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setRejectReason(e.target.value);
  }

  function handleCancelRequest() {
    onCancel?.(request.id);
  }

  function handleApproveRequest() {
    onApprove?.(request.id);
  }

  function handleRevertRequest() {
    onRevert?.(request.id);
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            aria-label="Actions"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem>
            <Eye className="mr-2 h-4 w-4" />
            View Details
          </DropdownMenuItem>
          {isSelf && status === "PENDING" && onCancel && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleCancelRequest}
                className="text-muted-foreground"
              >
                <X className="mr-2 h-4 w-4" />
                Cancel Request
              </DropdownMenuItem>
            </>
          )}
          {isAdmin && (
            <>
              <DropdownMenuSeparator />
              {status !== "APPROVED" && status !== "CANCELLED" && (
                <DropdownMenuItem
                  onClick={handleApproveRequest}
                  className="text-emerald-600"
                >
                  <Check className="mr-2 h-4 w-4" />
                  Approve
                </DropdownMenuItem>
              )}
              {status !== "REJECTED" && status !== "CANCELLED" && (
                <DropdownMenuItem
                  onClick={handleOpenRejectDialog}
                  className="text-rose-600"
                >
                  <X className="mr-2 h-4 w-4" />
                  Reject
                </DropdownMenuItem>
              )}
              {(status === "APPROVED" || status === "REJECTED") && (
                <DropdownMenuItem onClick={handleRevertRequest}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Revert to Pending
                </DropdownMenuItem>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejection reason</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Reason (optional)"
            value={rejectReason}
            onChange={handleRejectReasonChange}
            className="min-h-[80px] resize-none"
          />
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseRejectDialog}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmReject}>
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface LeavesTabContentProps {
  balances: LeaveBalance[];
  myLeaveRequests: LeaveRequest[];
  approvedLeavesThisWeek?: ApprovedLeave[];
}

export function LeavesTabContent({
  balances,
  myLeaveRequests,
  approvedLeavesThisWeek = [],
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
          onError: (err) => toast.error(err.message || "Failed to approve"),
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
          onError: (err) => toast.error(err.message || "Failed to reject"),
        },
      );
    },
    [rejectMutation],
  );

  const handleRevertRequest = useCallback(
    (id: number) => {
      revertMutation.mutate(id, {
        onSuccess: () => toast.success("Leave request reverted to pending"),
        onError: (err) => toast.error(err.message || "Failed to revert"),
      });
    },
    [revertMutation],
  );

  const handleCancelRequest = useCallback(
    (id: number) => {
      cancelMutation.mutate(id, {
        onSuccess: () => toast.success("Leave request cancelled"),
        onError: (err) => toast.error(err.message || "Failed to cancel"),
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
                  "h-7 w-7 rounded-lg flex items-center justify-center",
                  config.iconBg,
                )}
              >
                <Icon
                  className={cn("h-3.5 w-3.5", config.iconColor)}
                  aria-hidden="true"
                />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground leading-tight truncate">
                  {typeName.replace(" Leave", "")}
                </p>
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
              ? "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
              : status === "APPROVED"
                ? "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                : status === "CANCELLED"
                  ? "bg-muted text-muted-foreground border-border dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                  : "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800";
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
                <span
                  className="text-[10px] text-muted-foreground truncate max-w-[120px]"
                  title={row.managerComment}
                >
                  &ldquo;{row.managerComment}&rdquo;
                </span>
              )}
              {status === "REJECTED" && row.rejectionReason && (
                <span
                  className="text-[10px] text-rose-500 dark:text-rose-400 truncate max-w-[120px]"
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
    <div className="space-y-4">
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

      <Card className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center">
                <History
                  className="h-3.5 w-3.5 text-muted-foreground"
                  aria-hidden="true"
                />
              </div>
              Request History
            </CardTitle>
            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 text-xs text-muted-foreground"
                aria-label="Filter requests"
              >
                <Filter className="h-3.5 w-3.5" />
                Filter
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleExportExcel}
                className="h-8 gap-1.5 text-xs text-muted-foreground"
                aria-label="Export to Excel"
              >
                <Download className="h-3.5 w-3.5" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0" aria-live="polite">
          <DataTable
            data={myLeaveRequests}
            columns={columns}
            getRowKey={(row) => row.id}
            minWidth="600px"
            emptyState={
              <EmptyState
                illustration={<EmptyLeaveIllustration />}
                title="No leave requests"
                description="You haven't submitted any leave requests yet."
                className="flex-1"
              />
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
