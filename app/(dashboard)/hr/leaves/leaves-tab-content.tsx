"use client";

import React, { useState, useCallback } from "react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import ExcelJS from "exceljs";
import { useSession } from "next-auth/react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyLeaveIllustration } from "@/components/illustrations";
import { Filter, Download } from "lucide-react";
import { processLeaveRequest } from "@/server/actions/leave-actions";

import type { LeaveBalance, LeaveRequest } from "./leaves-shared";
import { BalanceCard, RequestHistoryRow } from "./leaves-shared";
import { ALLOWED_LEAVE_TYPE_NAMES } from "@/lib/leave-policy";

interface LeavesTabContentProps {
  balances: LeaveBalance[];
  myLeaveRequests: LeaveRequest[];
}

export function LeavesTabContent({ balances, myLeaveRequests }: LeavesTabContentProps) {
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
                        onApprove={handleApproveRequest}
                        onReject={handleRejectRequest}
                        onRevert={handleRevertRequest}
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
