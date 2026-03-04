"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, addDays, isBefore, isAfter, startOfDay } from "date-fns";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import {
  EmptyLeaveIllustration,
  EmptyWfhIllustration,
  EmptyApprovalIllustration,
  EmptyCalendarIllustration,
} from "@/components/illustrations";

import {
  Home,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Send,
  Filter,
  TrendingUp,
  AlertCircle,
  CalendarDays,
  Palmtree,
  Heart,
  Users,
} from "lucide-react";

import { resolveImageUrl } from "@/lib/utils";
import { getColorSafe, leaveStatusColors, wfhStatusColors } from "@/lib/theme-constants";
import { staggerContainer, fadeUp, fadeIn } from "@/lib/motion-variants";

interface LeaveBalance {
  id: number;
  leaveTypeId: number | null;
  balance: string;
  typeName: string | null;
}

interface LeaveType {
  id: number;
  name: string;
}

interface Approver {
  id: string;
  name: string | null;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  image?: string | null;
}

interface LeaveRequest {
  id: number;
  startDate: string | Date;
  endDate: string | Date;
  status: string | null;
  reason: string | null;
  leaveType: { name: string } | null;
  approver?: { name: string | null } | null;
  user?: {
    firstName: string | null;
    lastName: string | null;
    email: string;
    image?: string | null;
  } | null;
}

interface ApprovedLeave {
  id: number;
  startDate: string | Date;
  endDate: string | Date;
  user: {
    firstName: string | null;
    lastName: string | null;
    image: string | null;
  } | null;
  leaveType: { name: string } | null;
}

interface WfhRequest {
  id: number;
  date: string;
  reason: string | null;
  status: string | null;
  rejectionReason?: string | null;
  createdAt: string | Date | null;
  user?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    image: string | null;
  } | null;
}

interface LeavesWfhContentProps {
  balances: LeaveBalance[];
  leaveTypes: LeaveType[];
  approvers: Approver[];
  myLeaveRequests: LeaveRequest[];
  incomingLeaveRequests: LeaveRequest[];
  approvedLeavesThisWeek: ApprovedLeave[];
}


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

const leaveTypeIcons: Record<string, React.ElementType> = {
  "Annual Leave": Palmtree,
  "Sick Leave": Heart,
  "Personal Leave": CalendarDays,
};

const statusIconMap: Record<string, React.ElementType> = {
  PENDING: Clock,
  APPROVED: CheckCircle2,
  REJECTED: XCircle,
};

const MAX_BALANCE_DAYS = 20;


const StatsCard = React.memo(function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  accent,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ElementType;
  accent: string;
}) {
  return (
    <Card className="border-border" role="listitem">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {title}
            </p>
            <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          </div>
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${accent}`}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
});


const WfhRequestItem = React.memo(function WfhRequestItem({
  request,
  showUser = false,
  actions,
}: {
  request: WfhRequest;
  showUser?: boolean;
  actions?: React.ReactNode;
}) {
  const status = request.status || "PENDING";
  const StatusIcon = statusIconMap[status] ?? Clock;

  return (
    <div
      className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border hover:bg-muted/50 transition-colors"
      role="listitem"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {showUser && request.user && (
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarImage src={resolveImageUrl(request.user.image)} />
            <AvatarFallback className="text-xs bg-primary/10 text-primary">
              {request.user.firstName?.[0]}
              {request.user.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
        )}
        <div className="min-w-0 flex-1">
          {showUser && request.user && (
            <p className="text-sm font-medium text-foreground truncate">
              {request.user.firstName} {request.user.lastName}
            </p>
          )}
          <p className="text-sm text-foreground">
            {format(new Date(request.date), "EEEE, MMM dd, yyyy")}
          </p>
          {request.reason && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{request.reason}</p>
          )}
          {status === "REJECTED" && request.rejectionReason && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-0.5 truncate">
              Reason: {request.rejectionReason}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0 ml-3">
        <Badge
          variant="outline"
          className={`text-xs flex items-center gap-1 ${getColorSafe(wfhStatusColors, status)}`}
        >
          <StatusIcon className="h-3 w-3" aria-hidden="true" />
          {status}
        </Badge>
        {actions}
      </div>
    </div>
  );
});


export function LeavesWfhContent({
  balances,
  leaveTypes,
  approvers,
  myLeaveRequests,
  incomingLeaveRequests,
  approvedLeavesThisWeek,
}: LeavesWfhContentProps) {
  const { data: session } = useSession();
  const isAdmin =
    session?.user?.role === "OWNER" || session?.user?.role === "ADMIN";

  const [wfhStatusFilter, setWfhStatusFilter] = useState<string>("ALL");
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const utils = api.useUtils();


  const { data: myWfhRequests, isLoading: wfhLoading } =
    api.hr.getWfhRequests.useQuery();
  const { data: pendingWfhRequests } =
    api.hr.getPendingWfhRequests.useQuery();

  const wfhApprovers = useMemo(
    () =>
      approvers.filter(
        (m) =>
          (m as Approver & { role?: string }).role === "ADMIN" ||
          (m as Approver & { role?: string }).role === "OWNER" ||
          true
      ),
    [approvers]
  );


  const createWfhRequest = api.hr.createWfhRequest.useMutation({
    onSuccess: () => {
      toast.success("WFH request submitted successfully");
      utils.hr.getWfhRequests.invalidate();
      utils.hr.getPendingWfhRequests.invalidate();
      wfhForm.reset();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to submit WFH request");
    },
  });

  const processWfhRequest = api.hr.processWfhRequest.useMutation({
    onSuccess: (_, variables) => {
      const action = variables.status === "APPROVED" ? "approved" : "rejected";
      toast.success(`WFH request ${action}`);
      utils.hr.getPendingWfhRequests.invalidate();
      utils.hr.getWfhRequests.invalidate();
      setRejectDialogOpen(false);
      setRejectionReason("");
      setRejectingId(null);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to process request");
    },
  });


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
    createWfhRequest.mutate({
      date: new Date(data.startDate),
      reason: `${data.reason}${data.notes ? ` — ${data.notes}` : ""}`,
      approverId: data.approverId,
    });
  }


  const handleWfhApprove = useCallback(
    (requestId: number) => {
      processWfhRequest.mutate({ requestId, status: "APPROVED" });
    },
    [processWfhRequest]
  );

  const handleWfhRejectOpen = useCallback((requestId: number) => {
    setRejectingId(requestId);
    setRejectDialogOpen(true);
  }, []);

  const handleWfhRejectConfirm = useCallback(() => {
    if (rejectingId === null) return;
    processWfhRequest.mutate({
      requestId: rejectingId,
      status: "REJECTED",
      rejectionReason: rejectionReason || undefined,
    });
  }, [rejectingId, rejectionReason, processWfhRequest]);


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

  const totalPendingApprovals =
    incomingLeaveRequests.length + (pendingWfhRequests?.length || 0);

  return (
    <>
      <motion.div
        className="space-y-6"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >

        {approvedLeavesThisWeek.length > 0 && (
          <motion.div variants={fadeUp}>
            <Card className="border-border bg-amber-50/50 dark:bg-amber-950/10 border-amber-200/50 dark:border-amber-800/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-amber-800 dark:text-amber-400">
                  <Users className="h-4 w-4" aria-hidden="true" />
                  Who&apos;s Out This Week
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {approvedLeavesThisWeek.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-3" role="list" aria-label="Team members on leave this week">
                  {approvedLeavesThisWeek.map((leave) => (
                    <div
                      key={leave.id}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-card border border-amber-200/50 dark:border-amber-800/20"
                      role="listitem"
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
          </motion.div>
        )}


        <motion.div variants={fadeUp}>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" role="list" aria-label="Leave balances">
            {balances.map((bal, index) => {
              const Icon = leaveTypeIcons[bal.typeName ?? ""] ?? CalendarDays;
              const balanceNum = parseFloat(bal.balance) || 0;
              const pct = Math.min((balanceNum / MAX_BALANCE_DAYS) * 100, 100);
              return (
                <Card key={`${bal.leaveTypeId}-${index}`} className="border-border" role="listitem">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {bal.typeName}
                    </CardTitle>
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-foreground">{bal.balance}</div>
                    <p className="text-xs text-muted-foreground">Days Available</p>
                    <div
                      className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden"
                      role="progressbar"
                      aria-valuenow={balanceNum}
                      aria-valuemin={0}
                      aria-valuemax={MAX_BALANCE_DAYS}
                      aria-label={`${bal.typeName} balance`}
                      aria-valuetext={`${bal.balance} days available`}
                    >
                      <div
                        className={`h-full rounded-full transition-all ${
                          balanceNum <= 2
                            ? "bg-red-500"
                            : balanceNum <= 5
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </motion.div>


        <motion.div variants={fadeUp}>
          <Tabs defaultValue="my-leaves" className="space-y-4">
            <TabsList>
              <TabsTrigger value="my-leaves">My Leaves</TabsTrigger>
              <TabsTrigger value="wfh">Work From Home</TabsTrigger>
              {isAdmin && (
                <TabsTrigger value="approvals" className="relative">
                  Approvals
                  {totalPendingApprovals > 0 && (
                    <span
                      className="absolute -top-1 -right-1 flex h-2.5 w-2.5"
                      aria-label={`${totalPendingApprovals} pending approvals`}
                    >
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                    </span>
                  )}
                </TabsTrigger>
              )}
            </TabsList>


            <TabsContent value="my-leaves" className="space-y-4">
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-foreground">My Leave History</CardTitle>
                </CardHeader>
                <CardContent aria-live="polite">
                  {myLeaveRequests.length === 0 ? (
                    <EmptyState
                      illustration={<EmptyLeaveIllustration />}
                      title="No leave requests"
                      description="You haven't submitted any leave requests yet."
                    />
                  ) : (
                    <div className="space-y-3" role="list" aria-label="Leave request history">
                      {myLeaveRequests.map((req) => (
                        <div
                          key={req.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border"
                          role="listitem"
                        >
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-foreground">
                              {req.leaveType?.name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(req.startDate), "MMM dd")} –{" "}
                              {format(new Date(req.endDate), "MMM dd, yyyy")}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge
                              variant="outline"
                              className={`text-xs ${getColorSafe(leaveStatusColors, req.status ?? "PENDING")}`}
                            >
                              {req.status}
                            </Badge>
                            {req.status === "PENDING" && req.approver && (
                              <span className="text-xs text-muted-foreground hidden sm:inline">
                                Approver: {req.approver.name}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>


            <TabsContent value="wfh" className="space-y-4">
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
                              control={wfhForm.control}
                              name="endDate"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">End Date</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="date"
                                      className="text-sm"
                                      min={
                                        wfhForm.watch("startDate") ||
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
                                    {wfhApprovers.map((u) => (
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
            </TabsContent>


            {isAdmin && (
              <TabsContent value="approvals" className="space-y-6">

                <Card className="border-border">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-primary" aria-hidden="true" />
                      Pending Leave Requests
                      {incomingLeaveRequests.length > 0 && (
                        <Badge variant="secondary" className="ml-1">
                          {incomingLeaveRequests.length}
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {incomingLeaveRequests.length === 0 ? (
                      <EmptyState
                        illustration={<EmptyApprovalIllustration />}
                        title="No pending leave requests"
                        description="All leave requests have been processed."
                      />
                    ) : (
                      <LeaveApprovalsList requests={incomingLeaveRequests} />
                    )}
                  </CardContent>
                </Card>


                <Card className="border-border">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Home className="h-4 w-4 text-primary" aria-hidden="true" />
                      Pending WFH Requests
                      {pendingWfhRequests && pendingWfhRequests.length > 0 && (
                        <Badge variant="secondary" className="ml-1">
                          {pendingWfhRequests.length}
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!pendingWfhRequests || pendingWfhRequests.length === 0 ? (
                      <EmptyState
                        illustration={<EmptyCalendarIllustration />}
                        title="No pending WFH requests"
                        description="All WFH requests have been processed."
                      />
                    ) : (
                      <motion.div
                        className="space-y-3"
                        role="list"
                        aria-label="Pending WFH approvals"
                        variants={staggerContainer}
                        initial="hidden"
                        animate="visible"
                      >
                        {pendingWfhRequests.map((req) => (
                          <motion.div key={req.id} variants={fadeIn}>
                            <WfhRequestItem
                              request={req as WfhRequest}
                              showUser
                              actions={
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="default"
                                    onClick={() => handleWfhApprove(req.id)}
                                    disabled={processWfhRequest.isPending}
                                    className="h-8"
                                  >
                                    {processWfhRequest.isPending ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <CheckCircle2 className="h-3 w-3 mr-1" />
                                    )}
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleWfhRejectOpen(req.id)}
                                    disabled={processWfhRequest.isPending}
                                    className="h-8"
                                  >
                                    <XCircle className="h-3 w-3 mr-1" />
                                    Reject
                                  </Button>
                                </div>
                              }
                            />
                          </motion.div>
                        ))}
                      </motion.div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </motion.div>
      </motion.div>


      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject WFH Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Provide a reason for rejecting this request (optional).
            </p>
            <Textarea
              placeholder="Enter rejection reason..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialogOpen(false);
                setRejectionReason("");
                setRejectingId(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleWfhRejectConfirm}
              disabled={processWfhRequest.isPending}
            >
              {processWfhRequest.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              )}
              Reject Request
            </Button>
          </div>
        </DialogContent>
      </Dialog>


      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {createWfhRequest.isPending && "Submitting WFH request..."}
        {processWfhRequest.isPending && "Processing WFH request..."}
      </div>
    </>
  );
}


function LeaveApprovalsList({ requests }: { requests: LeaveRequest[] }) {
  const [processingId, setProcessingId] = useState<number | null>(null);
  const router = useRouter();

  async function handleProcess(requestId: number, status: "APPROVED" | "REJECTED") {
    setProcessingId(requestId);
    const { processLeaveRequest } = await import("@/server/actions/leave-actions");
    const res = await processLeaveRequest({ requestId, status });
    setProcessingId(null);

    if (res.success) {
      toast.success(`Request ${status.toLowerCase()} successfully`);
      router.refresh();
    } else {
      toast.error(res.error || "Failed to process");
    }
  }

  return (
    <div className="space-y-4" role="list" aria-label="Pending leave approvals">
      {requests.map((req) => (
        <div
          key={req.id}
          className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border"
          role="listitem"
        >
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarImage src={resolveImageUrl(req.user?.image)} />
              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                {req.user?.firstName?.[0]}
                {req.user?.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium text-foreground">
                {req.user?.firstName
                  ? `${req.user.firstName} ${req.user.lastName}`
                  : req.user?.email}
              </p>
              <p className="text-xs text-muted-foreground">
                {req.leaveType?.name} · {format(new Date(req.startDate), "MMM dd")} –{" "}
                {format(new Date(req.endDate), "MMM dd, yyyy")}
              </p>
              {req.reason && (
                <p className="text-xs text-muted-foreground mt-0.5">{req.reason}</p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="default"
              className="h-8"
              disabled={processingId === req.id}
              onClick={() => handleProcess(req.id, "APPROVED")}
            >
              {processingId === req.id ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3 w-3 mr-1" />
              )}
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8"
              disabled={processingId === req.id}
              onClick={() => handleProcess(req.id, "REJECTED")}
            >
              <XCircle className="h-3 w-3 mr-1" />
              Reject
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
