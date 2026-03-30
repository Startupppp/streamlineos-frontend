"use client";

import React, { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, startOfDay, differenceInCalendarDays } from "date-fns";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyLeaveIllustration } from "@/components/illustrations";

import {
  Loader2,
  Filter,
  CalendarDays,
  Download,
  AlertCircle,
} from "lucide-react";

import { submitLeaveRequest, processLeaveRequest } from "@/server/actions/leave-actions";
import { FileUpload } from "@/components/storage/file-upload";
import { useSession } from "next-auth/react";
import ExcelJS from "exceljs";

import type { LeaveBalance, LeaveType, Approver, LeaveRequest } from "./leaves-shared";
import { BalanceCard, RequestHistoryRow } from "./leaves-shared";
import { ALLOWED_LEAVE_TYPE_NAMES, LEAVE_MAX_DAYS } from "@/lib/leave-policy";

/* ─── Leave request form schema ─── */

const leaveFormSchema = z.object({
  leaveTypeId: z.string().min(1, "Leave type is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  halfDay: z.boolean(),
  reason: z.string().min(1, "Reason is required"),
  approverId: z.string().optional(),
});

type LeaveFormValues = z.infer<typeof leaveFormSchema>;

/* ─── Props ─── */

interface LeavesTabContentProps {
  balances: LeaveBalance[];
  leaveTypes: LeaveType[];
  approvers: Approver[];
  myLeaveRequests: LeaveRequest[];
  joiningDate: string | null;
}

/* ─── Component ─── */

export function LeavesTabContent({
  balances,
  leaveTypes,
  approvers,
  myLeaveRequests,
  joiningDate,
}: LeavesTabContentProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "CEO" || session?.user?.role === "HR" || session?.user?.role === "ADMIN";
  const [leaveFormLoading, setLeaveFormLoading] = useState(false);
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);

  // Minimum selectable date: the employee's Date of Joining (DOJ)
  const minDate = joiningDate
    ? format(new Date(joiningDate), "yyyy-MM-dd")
    : format(startOfDay(new Date()), "yyyy-MM-dd");

  const handleStatusChange = async (requestId: number, status: "APPROVED" | "REJECTED" | "PENDING", rejectionReason?: string) => {
    const result = await processLeaveRequest({ requestId, status, rejectionReason });
    if (result && "error" in result) {
      toast.error(result.error);
    } else {
      toast.success(`Leave request ${status.toLowerCase()}`);
      router.refresh();
    }
  };

  const currentYear = new Date().getFullYear();

  const leaveForm = useForm<LeaveFormValues>({
    resolver: zodResolver(leaveFormSchema),
    defaultValues: {
      leaveTypeId: "",
      startDate: "",
      endDate: "",
      halfDay: false,
      reason: "",
      approverId: "",
    },
  });

  /* ─── Issue #137: Leave day limit validation ─── */
  const watchedLeaveTypeId = leaveForm.watch("leaveTypeId");
  const watchedStartDate = leaveForm.watch("startDate");
  const watchedEndDate = leaveForm.watch("endDate");
  const watchedHalfDay = leaveForm.watch("halfDay");

  const leaveDayLimitError = useMemo(() => {
    if (!watchedLeaveTypeId || !watchedStartDate || !watchedEndDate) return null;
    const selectedType = leaveTypes.find((t) => t.id.toString() === watchedLeaveTypeId);
    if (!selectedType) return null;
    const maxDays = LEAVE_MAX_DAYS[selectedType.name];
    if (maxDays === undefined) return null; // no limit for this type (e.g. Unpaid)
    const days = watchedHalfDay
      ? 0.5
      : differenceInCalendarDays(new Date(watchedEndDate), new Date(watchedStartDate)) + 1;
    if (days > maxDays) {
      return `${selectedType.name} cannot exceed ${maxDays} days per year. You have selected ${days} day${days !== 1 ? "s" : ""}.`;
    }
    return null;
  }, [watchedLeaveTypeId, watchedStartDate, watchedEndDate, watchedHalfDay, leaveTypes]);

  async function onLeaveSubmit(data: LeaveFormValues) {
    if (!data.startDate || !data.endDate) return;

    // Issue #137: Block submission if day limit exceeded
    if (leaveDayLimitError) {
      toast.error(leaveDayLimitError);
      return;
    }

    const approverId = data.approverId || approvers[0]?.id;
    if (!approverId) {
      toast.error("No approver available");
      return;
    }

    setLeaveFormLoading(true);
    const result = await submitLeaveRequest({
      leaveTypeId: parseInt(data.leaveTypeId),
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      reason: data.reason,
      approverId,
      attachmentUrl: attachmentUrl || undefined,
    });
    setLeaveFormLoading(false);

    if (result.success) {
      toast.success("Leave requested successfully!");
      leaveForm.reset();
      setAttachmentUrl(null);
      router.refresh();
    } else {
      toast.error(result.error || "Failed to submit request");
    }
  }

  const handleExportExcel = async () => {
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
        { header: "Days", width: 8 },
        { header: "Status", width: 12 },
        { header: "Reason", width: 30 },
        { header: "Requested On", width: 14 },
      ];
      // Style header row
      ws.getRow(1).font = { bold: true };
      for (const req of myLeaveRequests) {
        ws.addRow([
          req.leaveType?.name || "-",
          req.startDate,
          req.endDate,
          "-",
          req.status,
          req.reason || "-",
          req.createdAt ? format(new Date(req.createdAt), "yyyy-MM-dd") : "-",
        ]);
      }
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
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
  };

  return (
    <>
      {/* ─── Overview Section ─── */}
      <div className="space-y-1 mb-4">
        <h2 className="text-xl font-bold text-foreground">Overview</h2>
        <p className="text-sm text-muted-foreground">
          Track your leave balances and history for the fiscal year {currentYear}.
        </p>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 mb-4" role="list" aria-label="Leave balances">
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

      {/* ─── Request History + Form ─── */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Request History Table (left) */}
        <div className="lg:col-span-8">
          <Card className="border-border">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <CardTitle className="text-base font-semibold text-foreground">Request History</CardTitle>
                <div className="flex items-center gap-3 shrink-0">
                  <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                    <Filter className="h-3.5 w-3.5" />
                    Filter
                  </button>
                  <button
                    onClick={handleExportExcel}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
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
                <>
                  <div className="overflow-x-auto" role="region" aria-label="Leave requests table" tabIndex={0}>
                    <table className="w-full">
                      <caption className="sr-only">Your leave request history</caption>
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left text-xs font-medium text-muted-foreground py-2.5 px-3">Type</th>
                          <th className="text-left text-xs font-medium text-muted-foreground py-2.5 px-3">Date Requested</th>
                          <th className="text-left text-xs font-medium text-muted-foreground py-2.5 px-3">Period</th>
                          <th className="text-center text-xs font-medium text-muted-foreground py-2.5 px-3">Days</th>
                          <th className="text-left text-xs font-medium text-muted-foreground py-2.5 px-3">Status</th>
                          <th className="text-right text-xs font-medium text-muted-foreground py-2.5 px-3">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {myLeaveRequests.slice(0, 5).map((req) => (
                          <RequestHistoryRow
                            key={req.id}
                            request={req}
                            isAdmin={isAdmin}
                            onApprove={(id) => handleStatusChange(id, "APPROVED")}
                            onReject={(id, reason) => handleStatusChange(id, "REJECTED", reason)}
                            onRevert={(id) => handleStatusChange(id, "PENDING")}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {myLeaveRequests.length > 5 && (
                    <div className="text-center pt-4">
                      <button className="text-sm text-gold hover:text-gold/80 font-medium transition-colors">
                        View All Requests
                      </button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* New Request Form (right) */}
        <div className="lg:col-span-4">
          <Card className="border-border">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold text-foreground">New Request</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">Fill in the details below</p>
                </div>
                <div className="h-9 w-9 rounded-lg bg-gold/10 flex items-center justify-center">
                  <CalendarDays className="h-4 w-4 text-gold" aria-hidden="true" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <Form {...leaveForm}>
                <form onSubmit={leaveForm.handleSubmit(onLeaveSubmit)} className="space-y-4">
                  {/* Leave Type */}
                  <FormField
                    control={leaveForm.control}
                    name="leaveTypeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium">Leave Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="text-sm">
                              <SelectValue placeholder="Select leave type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {leaveTypes.map((t) => (
                              <SelectItem key={t.id} value={t.id.toString()}>
                                {t.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* From / To dates */}
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={leaveForm.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-medium">From</FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              className="text-sm"
                              min={minDate}
                              max="9999-12-31"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={leaveForm.control}
                      name="endDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-medium">To</FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              className="text-sm"
                              min={
                                leaveForm.watch("startDate") || minDate
                              }
                              max="9999-12-31"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Half Day checkbox */}
                  <FormField
                    control={leaveForm.control}
                    name="halfDay"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="text-xs font-normal text-muted-foreground !mt-0">
                          Half Day Request
                        </FormLabel>
                      </FormItem>
                    )}
                  />

                  {/* Reason */}
                  <FormField
                    control={leaveForm.control}
                    name="reason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium">Reason</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="E.g. Family function, Doctor appointment..."
                            className="resize-none text-sm"
                            rows={3}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Attach documents */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      Attach Document (Optional)
                    </label>
                    <FileUpload
                      folder="leave-attachments"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      onUploadComplete={(url) => setAttachmentUrl(url)}
                    />
                  </div>

                  {/* Issue #137: Day limit warning */}
                  {leaveDayLimitError && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                      <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" aria-hidden="true" />
                      <p className="text-xs text-red-600 dark:text-red-400">{leaveDayLimitError}</p>
                    </div>
                  )}

                  {/* Submit */}
                  <Button
                    type="submit"
                    className="w-full bg-gold hover:bg-gold/90 text-white"
                    disabled={leaveFormLoading || !!leaveDayLimitError}
                  >
                    {leaveFormLoading && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                    )}
                    Submit Request
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ─── SR Announcement ─── */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {leaveFormLoading && "Submitting leave request..."}
      </div>
    </>
  );
}
