"use client";

import React, { useCallback, useMemo } from "react";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isWithinInterval } from "date-fns";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import ExcelJS from "exceljs";
import { useSession } from "next-auth/react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyLeaveIllustration } from "@/components/illustrations";
import { Filter, Download, CalendarDays } from "lucide-react";
import { processLeaveRequest, cancelLeaveRequest } from "@/server/actions/leave-actions";
import { cn, resolveImageUrl } from "@/lib/utils";

import type { LeaveBalance, LeaveRequest, ApprovedLeave } from "./leaves-shared";
import { BalanceCard, RequestHistoryRow } from "./leaves-shared";
import { ALLOWED_LEAVE_TYPE_NAMES } from "@/lib/leave-policy";

const DONUT_COLORS = ["#bd882c", "#3b82f6", "#ef4444", "#10b981", "#8b5cf6"];

function LeaveBalanceDonut({ balances }: { balances: LeaveBalance[] }) {
  const data = useMemo(
    () =>
      balances
        .filter(
          (b) =>
            b.typeName &&
            ALLOWED_LEAVE_TYPE_NAMES.has(b.typeName) &&
            (b.daysPerYear ?? 0) > 0,
        )
        .map((b) => ({
          name: b.typeName!,
          remaining: Math.max(0, parseFloat(b.balance || "0")),
          used: Math.max(0, (b.daysPerYear ?? 0) - parseFloat(b.balance || "0")),
          total: b.daysPerYear ?? 0,
        })),
    [balances],
  );

  if (data.length === 0) return null;

  const chartData = data.flatMap((d, i) => [
    { name: `${d.name} (used)`, value: d.used, color: DONUT_COLORS[i % DONUT_COLORS.length], opacity: 0.3 },
    { name: `${d.name} (remaining)`, value: d.remaining, color: DONUT_COLORS[i % DONUT_COLORS.length], opacity: 1 },
  ]);

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Balance Overview</CardTitle>
      </CardHeader>
      <CardContent>
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
              <div key={item.name} className="space-y-0.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }}
                    />
                    <span className="text-xs text-muted-foreground truncate">{item.name}</span>
                  </div>
                  <span className="text-xs font-semibold text-foreground shrink-0">
                    {item.remaining}/{item.total}
                  </span>
                </div>
                <div className="h-1 rounded-full bg-muted overflow-hidden ml-4">
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

function LeaveCalendarWidget({ approvedLeaves }: { approvedLeaves: ApprovedLeave[] }) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [approvedLeaves],
  );

  const hasAnyLeave = leavesPerDay.some((d) => d.leaves.length > 0);
  if (!hasAnyLeave) return null;

  const todayStr = format(today, "yyyy-MM-dd");

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" aria-hidden="true" />
          Who&apos;s Out This Week
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1">
          {leavesPerDay.map(({ day, leaves }) => {
            const isToday = format(day, "yyyy-MM-dd") === todayStr;
            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "rounded-lg p-1.5 min-h-[64px] flex flex-col",
                  isToday
                    ? "bg-gold/10 border border-gold/30"
                    : "bg-muted/30 border border-transparent",
                )}
              >
                <div
                  className={cn(
                    "text-[10px] font-medium text-center leading-tight mb-1",
                    isToday ? "text-gold" : "text-muted-foreground",
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
                    <Avatar key={l.id} className="h-5 w-5" title={`${l.user?.firstName} ${l.user?.lastName}`}>
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

interface LeavesTabContentProps {
  balances: LeaveBalance[];
  myLeaveRequests: LeaveRequest[];
  approvedLeavesThisWeek?: ApprovedLeave[];
}

export function LeavesTabContent({ balances, myLeaveRequests, approvedLeavesThisWeek = [] }: LeavesTabContentProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const isAdmin =
    session?.user?.role === "CEO" ||
    session?.user?.role === "HR" ||
    session?.user?.role === "ADMIN";

  const currentYear = new Date().getFullYear();

  const handleStatusChange = useCallback(async (
    requestId: number,
    status: "APPROVED" | "REJECTED" | "PENDING",
    rejectionReason?: string,
  ) => {
    const result = await processLeaveRequest({ requestId, status, rejectionReason });
    if (result && "error" in result) {
      toast.error(result.error);
    } else {
      toast.success(`Leave request ${status.toLowerCase()}`);
      router.refresh();
    }
  }, [router]);

  const handleApproveRequest = useCallback((id: number) => handleStatusChange(id, "APPROVED"), [handleStatusChange]);
  const handleRejectRequest = useCallback((id: number, reason?: string) => handleStatusChange(id, "REJECTED", reason), [handleStatusChange]);
  const handleRevertRequest = useCallback((id: number) => handleStatusChange(id, "PENDING"), [handleStatusChange]);

  const handleCancelRequest = useCallback(async (id: number) => {
    const result = await cancelLeaveRequest(id);
    if (result && "error" in result) {
      toast.error(result.error);
    } else {
      toast.success("Leave request cancelled");
      router.refresh();
    }
  }, [router]);

  const handleExportExcel = useCallback(async () => {
    if (myLeaveRequests.length === 0) {
      toast.error("No leave requests to export");
      return;
    }
    try {
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

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-foreground">Overview</h2>
        <p className="text-sm text-muted-foreground">
          Your leave balances and history for {currentYear}.
        </p>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-3" role="list" aria-label="Leave balances">
        {balances
          .filter((bal) => bal.typeName && ALLOWED_LEAVE_TYPE_NAMES.has(bal.typeName))
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
        <LeaveBalanceDonut balances={balances} />
        <LeaveCalendarWidget approvedLeaves={approvedLeavesThisWeek} />
      </div>

      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <CardTitle className="text-base font-semibold text-foreground">Request History</CardTitle>
            <div className="flex items-center gap-3 shrink-0">
              <button
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Filter requests"
              >
                <Filter className="h-3.5 w-3.5" />
                Filter
              </button>
              <button
                onClick={handleExportExcel}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Export to Excel"
              >
                <Download className="h-3.5 w-3.5" />
                Export
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0" aria-live="polite">
          {myLeaveRequests.length === 0 ? (
            <EmptyState
              illustration={<EmptyLeaveIllustration />}
              title="No leave requests"
              description="You haven't submitted any leave requests yet."
            />
          ) : (
            <ScrollArea className="w-full" type="auto">
              <div className="min-w-[600px]">
                <table className="w-full">
                  <caption className="sr-only">Your leave request history</caption>
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left text-xs font-medium text-muted-foreground py-2.5 px-3">Type</th>
                      <th className="text-left text-xs font-medium text-muted-foreground py-2.5 px-3">Date Requested</th>
                      <th className="text-left text-xs font-medium text-muted-foreground py-2.5 px-3">Period</th>
                      <th className="text-left text-xs font-medium text-muted-foreground py-2.5 px-3">Priority</th>
                      <th className="text-left text-xs font-medium text-muted-foreground py-2.5 px-3">Status</th>
                      <th className="text-right text-xs font-medium text-muted-foreground py-2.5 px-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myLeaveRequests.map((req) => (
                      <RequestHistoryRow
                        key={req.id}
                        request={req}
                        isAdmin={isAdmin}
                        isSelf
                        onApprove={handleApproveRequest}
                        onReject={handleRejectRequest}
                        onRevert={handleRevertRequest}
                        onCancel={handleCancelRequest}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
