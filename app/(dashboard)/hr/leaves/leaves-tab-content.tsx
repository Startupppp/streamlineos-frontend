"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, startOfDay } from "date-fns";
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
} from "lucide-react";

import { submitLeaveRequest } from "@/server/actions/leave-actions";
import { FileUpload } from "@/components/storage/file-upload";

import type { LeaveBalance, LeaveType, Approver, LeaveRequest } from "./leaves-shared";
import { BalanceCard, RequestHistoryRow } from "./leaves-shared";
import { ALLOWED_LEAVE_TYPE_NAMES } from "@/lib/leave-policy";

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
}

/* ─── Component ─── */

export function LeavesTabContent({
  balances,
  leaveTypes,
  approvers,
  myLeaveRequests,
}: LeavesTabContentProps) {
  const router = useRouter();
  const [leaveFormLoading, setLeaveFormLoading] = useState(false);
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);

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

  async function onLeaveSubmit(data: LeaveFormValues) {
    if (!data.startDate || !data.endDate) return;

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
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-foreground">Request History</CardTitle>
                <div className="flex items-center gap-3">
                  <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                    <Filter className="h-3.5 w-3.5" />
                    Filter
                  </button>
                  <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
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
                          <RequestHistoryRow key={req.id} request={req} />
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
                              min={format(startOfDay(new Date()), "yyyy-MM-dd")}
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
                                leaveForm.watch("startDate") ||
                                format(startOfDay(new Date()), "yyyy-MM-dd")
                              }
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

                  {/* Submit */}
                  <Button
                    type="submit"
                    className="w-full bg-gold hover:bg-gold/90 text-white"
                    disabled={leaveFormLoading}
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
