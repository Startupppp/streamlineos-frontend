"use client";

import React, { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, addDays, isBefore, isAfter, startOfDay } from "date-fns";
import { motion } from "framer-motion";
import { useHrWfhRequests, useCreateWfhRequest } from "@/lib/api/hooks/hr";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
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
import { EmptyWfhIllustration } from "@/components/illustrations";

import {
  Home,
  Loader2,
  Send,
  Filter,
  TrendingUp,
  AlertCircle,
} from "lucide-react";

import { staggerContainer, fadeIn } from "@/lib/motion-variants";

import type { Approver, WfhRequest } from "./leaves-shared";
import { WfhRequestItem, StatsCard } from "./leaves-shared";

/* ─── WFH form schema ─── */

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

const WFH_REASONS = [
  "Personal commitment",
  "Health / Medical",
  "Home maintenance",
  "Childcare",
  "Weather conditions",
  "Internet / Utility work",
  "Other",
] as const;

/* ─── Props ─── */

interface WfhTabContentProps {
  approvers: Approver[];
}

/* ─── Component ─── */

export function WfhTabContent({ approvers }: WfhTabContentProps) {
  const [wfhStatusFilter, setWfhStatusFilter] = useState<string>("ALL");

  const { data: myWfhRequests, isLoading: wfhLoading } = useHrWfhRequests();
  const createWfhRequest = useCreateWfhRequest();

  const wfhForm = useForm<WfhFormValues>({
    resolver: zodResolver(wfhFormSchema),
    defaultValues: {
      startDate: format(addDays(new Date(), 1), "yyyy-MM-dd"),
      endDate: format(addDays(new Date(), 1), "yyyy-MM-dd"),
      reason: "",
      notes: "",
      approverId: "",
    },
  });

  function onWfhSubmit(data: WfhFormValues) {
    createWfhRequest.mutate(
      {
        date: new Date(data.startDate),
        reason: `${data.reason}${data.notes ? ` — ${data.notes}` : ""}`,
        approverId: data.approverId,
      },
      {
        onSuccess: () => {
          toast.success("WFH request submitted successfully");
          wfhForm.reset();
        },
        onError: (error) => {
          toast.error(error.message || "Failed to submit WFH request");
        },
      }
    );
  }

  const filteredWfhRequests = useMemo(() => {
    if (!myWfhRequests) return [];
    if (wfhStatusFilter === "ALL") return myWfhRequests;
    return myWfhRequests.filter((r) => (r.status || "PENDING") === wfhStatusFilter);
  }, [myWfhRequests, wfhStatusFilter]);

  const wfhStats = useMemo(() => {
    if (!myWfhRequests) return { thisMonth: 0, pending: 0 };
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      thisMonth: myWfhRequests.filter((r) => {
        const d = new Date(r.date);
        return r.status === "APPROVED" && !isBefore(d, monthStart) && !isAfter(d, monthEnd);
      }).length,
      pending: myWfhRequests.filter((r) => !r.status || r.status === "PENDING").length,
    };
  }, [myWfhRequests]);

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-4 space-y-4">
          <Card className="border-border">
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Home className="h-4 w-4 text-primary" aria-hidden="true" />
                New WFH Request
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...wfhForm}>
                <form onSubmit={wfhForm.handleSubmit(onWfhSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={wfhForm.control}
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
                      control={wfhForm.control}
                      name="endDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">End Date</FormLabel>
                          <FormControl>
                            <DatePicker
                              value={field.value}
                              onChange={field.onChange}
                              fromDate={wfhForm.watch("startDate") ? new Date(wfhForm.watch("startDate")) : startOfDay(new Date())}
                              placeholder="End date"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={wfhForm.control}
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
                              <SelectItem key={reason} value={reason}>
                                {reason}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={wfhForm.control}
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
                                {u.name ||
                                  `${u.firstName || ""} ${u.lastName || ""}`.trim() ||
                                  u.email}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={wfhForm.control}
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

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={createWfhRequest.isPending}
                  >
                    {createWfhRequest.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Send className="mr-2 h-4 w-4" aria-hidden="true" />
                    )}
                    Submit Request
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-3" role="list" aria-label="WFH statistics">
            <StatsCard
              title="Monthly WFH"
              value={wfhStats.thisMonth}
              subtitle="This month (approved)"
              icon={TrendingUp}
              accent="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            />
            <StatsCard
              title="Pending"
              value={wfhStats.pending}
              subtitle="Awaiting approval"
              icon={AlertCircle}
              accent="bg-amber-500/10 text-amber-600 dark:text-amber-400"
            />
          </div>
        </div>

        <div className="lg:col-span-8">
          <Card className="border-border">
            <CardHeader className="pb-0">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">My WFH Requests</CardTitle>
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <Select value={wfhStatusFilter} onValueChange={setWfhStatusFilter}>
                    <SelectTrigger className="h-8 w-[130px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Status</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="APPROVED">Approved</SelectItem>
                      <SelectItem value="REJECTED">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4" aria-live="polite">
              {wfhLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredWfhRequests.length === 0 ? (
                <EmptyState
                  illustration={<EmptyWfhIllustration />}
                  title={
                    wfhStatusFilter === "ALL"
                      ? "No WFH requests yet"
                      : `No ${wfhStatusFilter.toLowerCase()} requests`
                  }
                  description="Submit a WFH request using the form on the left."
                />
              ) : (
                <motion.div
                  className="space-y-3"
                  role="list"
                  aria-label="My WFH requests"
                  variants={staggerContainer}
                  initial="hidden"
                  animate="visible"
                >
                  {filteredWfhRequests.map((req) => (
                    <motion.div key={req.id} variants={fadeIn}>
                      <WfhRequestItem request={req as WfhRequest} />
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ─── SR Announcement ─── */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {createWfhRequest.isPending && "Submitting WFH request..."}
      </div>
    </>
  );
}
