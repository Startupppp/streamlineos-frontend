"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  format, startOfDay, differenceInCalendarDays, addDays, isBefore,
} from "date-fns";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useHrPendingWfhRequests, useCreateWfhRequest } from "@/lib/api/hooks/hr";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { Checkbox } from "@/components/ui/checkbox";
import { FileUpload } from "@/components/storage/file-upload";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { HrSheet } from "@/features/hr/hr-sheet";
import { Plus, Users, AlertCircle, Home } from "lucide-react";
import { resolveImageUrl } from "@/lib/utils";
import { submitLeaveRequest } from "@/server/actions/leave-actions";
import { ALLOWED_LEAVE_TYPE_NAMES, LEAVE_MAX_DAYS } from "@/lib/leave-policy";

import type {
  LeaveBalance, LeaveType, Approver, LeaveRequest, ApprovedLeave,
} from "./leaves-shared";
import { LeavesTabContent } from "./leaves-tab-content";
import { WfhTabContent } from "./wfh-tab-content";
import { LeaveApprovalsContent } from "./leave-approvals";

/* ─── Leave Request Sheet ─── */

const leaveFormSchema = z.object({
  leaveTypeId: z.string().min(1, "Leave type is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  halfDay: z.boolean(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
  reason: z.string().min(1, "Reason is required"),
  approverId: z.string().optional(),
});
type LeaveFormValues = z.infer<typeof leaveFormSchema>;

function LeaveRequestSheet({
  open, onOpenChange, leaveTypes, approvers, joiningDate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  leaveTypes: LeaveType[];
  approvers: Approver[];
  joiningDate: string | null;
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);

  const minDate = joiningDate
    ? format(new Date(joiningDate), "yyyy-MM-dd")
    : format(startOfDay(new Date()), "yyyy-MM-dd");

  const form = useForm<LeaveFormValues>({
    resolver: zodResolver(leaveFormSchema),
    defaultValues: {
      leaveTypeId: "",
      startDate: "",
      endDate: "",
      halfDay: false,
      priority: "MEDIUM",
      reason: "",
      approverId: "",
    },
  });

  const watchedLeaveTypeId = form.watch("leaveTypeId");
  const watchedStartDate = form.watch("startDate");
  const watchedEndDate = form.watch("endDate");
  const watchedHalfDay = form.watch("halfDay");

  const leaveDayLimitError = useMemo(() => {
    if (!watchedLeaveTypeId || !watchedStartDate || !watchedEndDate) return null;
    const selectedType = leaveTypes.find((t) => t.id.toString() === watchedLeaveTypeId);
    if (!selectedType) return null;
    const maxDays = LEAVE_MAX_DAYS[selectedType.name];
    if (maxDays === undefined) return null;
    const days = watchedHalfDay
      ? 0.5
      : differenceInCalendarDays(new Date(watchedEndDate), new Date(watchedStartDate)) + 1;
    if (days > maxDays) {
      return `${selectedType.name} cannot exceed ${maxDays} days. You selected ${days} day${days !== 1 ? "s" : ""}.`;
    }
    return null;
  }, [watchedLeaveTypeId, watchedStartDate, watchedEndDate, watchedHalfDay, leaveTypes]);

  const handleAttachmentUpload = useCallback((url: string) => setAttachmentUrl(url), []);

  const onSubmit = useCallback(async (data: LeaveFormValues) => {
    if (leaveDayLimitError) { toast.error(leaveDayLimitError); return; }
    const approverId = data.approverId || approvers[0]?.id;
    if (!approverId) { toast.error("No approver available"); return; }
    setIsLoading(true);
    const result = await submitLeaveRequest({
      leaveTypeId: parseInt(data.leaveTypeId),
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      reason: data.reason,
      priority: data.priority,
      approverId,
      attachmentUrl: attachmentUrl || undefined,
    });
    setIsLoading(false);
    if (result.success) {
      toast.success("Leave requested successfully!");
      form.reset();
      setAttachmentUrl(null);
      onOpenChange(false);
      router.refresh();
    } else {
      toast.error(result.error || "Failed to submit request");
    }
  }, [leaveDayLimitError, approvers, attachmentUrl, form, onOpenChange, router]);

  return (
    <HrSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Request Leave"
      description="Fill in the details to submit a leave request"
      onSubmit={form.handleSubmit(onSubmit)}
      submitLabel="Submit Request"
      isPending={isLoading}
    >
      <Form {...form}>
        <div className="space-y-4">
          <FormField
            control={form.control}
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
                      <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium">From</FormLabel>
                  <FormControl>
                    <DatePicker
                      value={field.value}
                      onChange={field.onChange}
                      fromDate={minDate ? new Date(minDate) : undefined}
                      placeholder="Start date"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium">To</FormLabel>
                  <FormControl>
                    <DatePicker
                      value={field.value}
                      onChange={field.onChange}
                      fromDate={watchedStartDate ? new Date(watchedStartDate) : (minDate ? new Date(minDate) : undefined)}
                      placeholder="End date"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="halfDay"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="text-xs font-normal text-muted-foreground !mt-0">
                  Half Day Request
                </FormLabel>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium">Priority</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="LOW">
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />Low
                      </span>
                    </SelectItem>
                    <SelectItem value="MEDIUM">
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-amber-500" />Medium
                      </span>
                    </SelectItem>
                    <SelectItem value="HIGH">
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-red-500" />High
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {approvers.length > 1 && (
            <FormField
              control={form.control}
              name="approverId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium">Approver</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Select approver" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {approvers.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name || `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
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

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Attach Document <span className="text-muted-foreground/60">(Optional)</span>
            </label>
            <FileUpload
              folder="leave-attachments"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              onUploadComplete={handleAttachmentUpload}
            />
          </div>

          {leaveDayLimitError && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-xs text-destructive">{leaveDayLimitError}</p>
            </div>
          )}
        </div>
      </Form>
    </HrSheet>
  );
}

/* ─── WFH Request Sheet ─── */

const WFH_REASONS = [
  "Personal commitment",
  "Health / Medical",
  "Home maintenance",
  "Childcare",
  "Weather conditions",
  "Internet / Utility work",
  "Other",
] as const;

const wfhFormSchema = z
  .object({
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    reason: z.string().min(1, "Reason is required"),
    notes: z.string().optional(),
    approverId: z.string().min(1, "Approver is required"),
  })
  .refine(
    (data) => {
      if (!data.startDate || !data.endDate) return true;
      return !isBefore(new Date(data.endDate), new Date(data.startDate));
    },
    { message: "End date cannot be before start date", path: ["endDate"] }
  );
type WfhFormValues = z.infer<typeof wfhFormSchema>;

function WfhRequestSheet({
  open, onOpenChange, approvers,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  approvers: Approver[];
}) {
  const createWfhRequest = useCreateWfhRequest();

  const form = useForm<WfhFormValues>({
    resolver: zodResolver(wfhFormSchema),
    defaultValues: {
      startDate: format(addDays(new Date(), 1), "yyyy-MM-dd"),
      endDate: format(addDays(new Date(), 1), "yyyy-MM-dd"),
      reason: "",
      notes: "",
      approverId: "",
    },
  });

  const watchedStartDate = form.watch("startDate");

  const onSubmit = useCallback((data: WfhFormValues) => {
    createWfhRequest.mutate(
      {
        date: new Date(data.startDate),
        reason: `${data.reason}${data.notes ? ` — ${data.notes}` : ""}`,
        approverId: data.approverId,
      },
      {
        onSuccess: () => {
          toast.success("WFH request submitted successfully");
          form.reset({
            startDate: format(addDays(new Date(), 1), "yyyy-MM-dd"),
            endDate: format(addDays(new Date(), 1), "yyyy-MM-dd"),
            reason: "",
            notes: "",
            approverId: "",
          });
          onOpenChange(false);
        },
        onError: (error) => {
          toast.error(error.message || "Failed to submit WFH request");
        },
      }
    );
  }, [createWfhRequest, form, onOpenChange]);

  return (
    <HrSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Request Work From Home"
      description="Submit a WFH request for approval"
      onSubmit={form.handleSubmit(onSubmit)}
      submitLabel="Submit Request"
      isPending={createWfhRequest.isPending}
    >
      <Form {...form}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Start Date</FormLabel>
                  <FormControl>
                    <DatePicker
                      value={field.value}
                      onChange={field.onChange}
                      fromDate={startOfDay(new Date())}
                      placeholder="Start date"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">End Date</FormLabel>
                  <FormControl>
                    <DatePicker
                      value={field.value}
                      onChange={field.onChange}
                      fromDate={watchedStartDate ? new Date(watchedStartDate) : startOfDay(new Date())}
                      placeholder="End date"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="reason"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Reason</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Select reason" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {WFH_REASONS.map((reason) => (
                      <SelectItem key={reason} value={reason}>{reason}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="approverId"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Approver</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Select approver" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {approvers.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name || `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">
                  Notes <span className="text-muted-foreground">(optional)</span>
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Any additional details..."
                    className="resize-none text-sm"
                    rows={3}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </Form>
    </HrSheet>
  );
}

/* ─── Props ─── */

interface LeavesWfhContentProps {
  balances: LeaveBalance[];
  leaveTypes: LeaveType[];
  approvers: Approver[];
  myLeaveRequests: LeaveRequest[];
  incomingLeaveRequests: LeaveRequest[];
  allIncomingLeaveRequests: LeaveRequest[];
  approvedLeavesThisWeek: ApprovedLeave[];
  joiningDate: string | null;
}

/* ─── Main Component ─── */

export function LeavesWfhContent({
  balances,
  leaveTypes,
  approvers,
  myLeaveRequests,
  incomingLeaveRequests,
  allIncomingLeaveRequests,
  approvedLeavesThisWeek,
  joiningDate,
}: LeavesWfhContentProps) {
  const { data: session } = useSession();
  const isAdmin =
    session?.user?.role === "CEO" ||
    session?.user?.role === "ADMIN" ||
    session?.user?.role === "HR";

  const { data: pendingWfhRequests } = useHrPendingWfhRequests();
  const totalPendingApprovals =
    incomingLeaveRequests.length + (pendingWfhRequests?.length || 0);

  const [leaveSheetOpen, setLeaveSheetOpen] = useState(false);
  const [wfhSheetOpen, setWfhSheetOpen] = useState(false);

  const handleOpenLeaveSheet = useCallback(() => setLeaveSheetOpen(true), []);
  const handleOpenWfhSheet = useCallback(() => setWfhSheetOpen(true), []);

  return (
    <>
      <PageWrapper
        title="Leaves & Time Off"
        subtitle="Manage your leave requests, work from home, and approvals."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenWfhSheet}
              className="gap-1.5"
            >
              <Home className="h-3.5 w-3.5" />
              Request WFH
            </Button>
            <Button
              size="sm"
              onClick={handleOpenLeaveSheet}
              className="gap-1.5 bg-gold hover:bg-gold/80 text-white"
            >
              <Plus className="h-3.5 w-3.5" />
              Request Leave
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          {/* ─── Who's Out Banner ─── */}
          {approvedLeavesThisWeek.length > 0 && (
            <Card className="border-amber-200/50 dark:border-amber-800/30 bg-amber-50/50 dark:bg-amber-950/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-amber-800 dark:text-amber-400">
                  <Users className="h-4 w-4" />
                  Who&apos;s Out This Week
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {approvedLeavesThisWeek.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-3">
                  {approvedLeavesThisWeek.map((leave) => (
                    <div
                      key={leave.id}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-card border border-amber-200/50 dark:border-amber-800/20"
                    >
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={resolveImageUrl(leave.user?.image)} />
                        <AvatarFallback className="text-[10px] bg-amber-100 text-amber-700">
                          {leave.user?.firstName?.[0]}
                          {leave.user?.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">
                          {leave.user?.firstName} {leave.user?.lastName}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {format(new Date(leave.startDate), "MMM dd")} –{" "}
                          {format(new Date(leave.endDate), "MMM dd")}
                          {leave.leaveType && (
                            <span className="ml-1 text-amber-600 dark:text-amber-400">
                              · {leave.leaveType.name}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ─── Tabs ─── */}
          <Tabs defaultValue="my-leaves">
            <TabsList className="bg-muted/50 border border-border p-1 rounded-lg h-auto gap-1">
              <TabsTrigger
                value="my-leaves"
                className="data-[state=active]:bg-gold data-[state=active]:text-white data-[state=active]:shadow-sm rounded-md px-4 py-2 text-sm font-medium transition-all"
              >
                My Leaves
              </TabsTrigger>
              <TabsTrigger
                value="wfh"
                className="data-[state=active]:bg-gold data-[state=active]:text-white data-[state=active]:shadow-sm rounded-md px-4 py-2 text-sm font-medium transition-all"
              >
                Work From Home
              </TabsTrigger>
              {isAdmin && (
                <TabsTrigger
                  value="approvals"
                  className="relative data-[state=active]:bg-gold data-[state=active]:text-white data-[state=active]:shadow-sm rounded-md px-4 py-2 text-sm font-medium transition-all"
                >
                  Approvals
                  {totalPendingApprovals > 0 && (
                    <Badge className="ml-2 h-5 min-w-5 px-1.5 bg-red-500 text-white text-[10px] font-bold border-0">
                      {totalPendingApprovals}
                    </Badge>
                  )}
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="my-leaves" className="mt-4">
              <LeavesTabContent
                balances={balances}
                myLeaveRequests={myLeaveRequests}
              />
            </TabsContent>

            <TabsContent value="wfh" className="mt-4">
              <WfhTabContent />
            </TabsContent>

            {isAdmin && (
              <TabsContent value="approvals" className="mt-4">
                <LeaveApprovalsContent
                  incomingLeaveRequests={incomingLeaveRequests}
                  allIncomingLeaveRequests={allIncomingLeaveRequests}
                />
              </TabsContent>
            )}
          </Tabs>
        </div>
      </PageWrapper>

      <LeaveRequestSheet
        open={leaveSheetOpen}
        onOpenChange={setLeaveSheetOpen}
        leaveTypes={leaveTypes}
        approvers={approvers}
        joiningDate={joiningDate}
      />
      <WfhRequestSheet
        open={wfhSheetOpen}
        onOpenChange={setWfhSheetOpen}
        approvers={approvers}
      />
    </>
  );
}
