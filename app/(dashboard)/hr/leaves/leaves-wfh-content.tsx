"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, addDays, isBefore, isAfter, startOfDay, differenceInCalendarDays } from "date-fns";
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
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Info,
  Paperclip,
  MoreVertical,
  Download,
  Eye,
  Trash2,
} from "lucide-react";

import { resolveImageUrl } from "@/lib/utils";
import { getColorSafe, leaveStatusColors, wfhStatusColors } from "@/lib/theme-constants";
import { staggerContainer, fadeUp, fadeIn } from "@/lib/motion-variants";
import { submitLeaveRequest } from "@/server/actions/leave-actions";
import { ALLOWED_LEAVE_TYPE_NAMES } from "@/lib/leave-policy";

/* ─── Types ─── */

interface LeaveBalance {
  id: number;
  leaveTypeId: number | null;
  balance: string;
  typeName: string | null;
  daysPerYear: number | null;
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
  createdAt?: string | Date | null;
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

/* ─── Leave balance card config ─── */

const balanceCardConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  "Casual Leave": { label: "CASUAL", color: "bg-gold", icon: CalendarDays },
  "Sick Leave": { label: "SICK", color: "bg-red-400", icon: Heart },
  "Unpaid Leave": { label: "UNPAID", color: "bg-slate-400", icon: Palmtree },
};

const DEFAULT_CARD_CONFIG = { label: "LEAVE", color: "bg-slate-400", icon: CalendarDays };

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

const statusIconMap: Record<string, React.ElementType> = {
  PENDING: Clock,
  APPROVED: CheckCircle2,
  REJECTED: XCircle,
};

/* ─── Balance Card ─── */

const BalanceCard = React.memo(function BalanceCard({
  typeName,
  balance,
  daysPerYear,
}: {
  typeName: string | null;
  balance: string;
  daysPerYear: number | null;
}) {
  const name = typeName ?? "Leave";
  const config = balanceCardConfig[name] ?? DEFAULT_CARD_CONFIG;
  const balanceNum = parseFloat(balance) || 0;
  const total = daysPerYear ?? 0;
  const pct = total > 0 ? Math.min((balanceNum / total) * 100, 100) : 0;
  const isUnpaid = name.toLowerCase().includes("unpaid");

  return (
    <Card className="border-border" role="listitem">
      <CardContent className="pt-5 pb-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {config.label}
          </span>
          <button className="text-muted-foreground hover:text-foreground" aria-label={`Info about ${name}`}>
            <Info className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-1">
          <span className="text-3xl font-bold text-foreground">{Math.floor(balanceNum)}</span>
          {total > 0 && (
            <span className="text-lg text-muted-foreground ml-1">/ {total}</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          {isUnpaid ? "Days Taken" : "Days Available"}
        </p>

        <div
          className="h-1.5 bg-muted rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={balanceNum}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-label={`${name} balance`}
          aria-valuetext={`${Math.floor(balanceNum)} of ${total} days available`}
        >
          <div
            className={`h-full rounded-full transition-all duration-500 ${config.color}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
});

/* ─── WFH Request Item ─── */

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

/* ─── Stats Card ─── */

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

/* ─── Request History Row ─── */

const RequestHistoryRow = React.memo(function RequestHistoryRow({
  request,
}: {
  request: LeaveRequest;
}) {
  const status = request.status ?? "PENDING";
  const typeName = request.leaveType?.name ?? "Leave";
  const config = balanceCardConfig[typeName] ?? DEFAULT_CARD_CONFIG;
  const Icon = config.icon;
  const start = new Date(request.startDate);
  const end = new Date(request.endDate);
  const days = differenceInCalendarDays(end, start) + 1;
  const createdAt = request.createdAt ? new Date(request.createdAt) : start;

  const periodStr =
    days === 1
      ? format(start, "MMM d")
      : `${format(start, "MMM d")} - ${format(end, "MMM d")}`;

  const statusDotColor =
    status === "PENDING"
      ? "bg-amber-500"
      : status === "APPROVED"
      ? "bg-emerald-500"
      : "bg-red-500";

  return (
    <tr className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
      <td className="py-3.5 px-3">
        <div className="flex items-center gap-2.5">
          <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
            status === "PENDING" ? "bg-amber-500/10" : status === "APPROVED" ? "bg-emerald-500/10" : "bg-red-500/10"
          }`}>
            <Icon className={`h-4 w-4 ${
              status === "PENDING" ? "text-amber-600" : status === "APPROVED" ? "text-emerald-600" : "text-red-600"
            }`} aria-hidden="true" />
          </div>
          <span className="text-sm font-medium text-foreground">{typeName.replace(" Leave", "")}<br /><span className="font-normal text-muted-foreground">Leave</span></span>
        </div>
      </td>
      <td className="py-3.5 px-3 text-sm text-muted-foreground">
        {format(createdAt, "MMM d, yyyy")}
      </td>
      <td className="py-3.5 px-3 text-sm text-muted-foreground">
        {periodStr}
      </td>
      <td className="py-3.5 px-3 text-sm text-foreground text-center">
        {days}
      </td>
      <td className="py-3.5 px-3">
        <div className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${statusDotColor}`} />
          <span className={`text-xs font-medium ${
            status === "PENDING"
              ? "text-amber-600 dark:text-amber-400"
              : status === "APPROVED"
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-red-600 dark:text-red-400"
          }`}>
            {status.charAt(0) + status.slice(1).toLowerCase()}
          </span>
        </div>
      </td>
      <td className="py-3.5 px-3 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Actions">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
});

/* ─── Main Component ─── */

export function LeavesWfhContent({
  balances,
  leaveTypes,
  approvers,
  myLeaveRequests,
  incomingLeaveRequests,
  approvedLeavesThisWeek,
}: LeavesWfhContentProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const isAdmin =
    session?.user?.role === "OWNER" || session?.user?.role === "ADMIN";

  const [wfhStatusFilter, setWfhStatusFilter] = useState<string>("ALL");
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [leaveFormLoading, setLeaveFormLoading] = useState(false);

  const utils = api.useUtils();

  /* ─── WFH queries & mutations ─── */

  const { data: myWfhRequests, isLoading: wfhLoading } =
    api.hr.getWfhRequests.useQuery();
  const { data: pendingWfhRequests } =
    api.hr.getPendingWfhRequests.useQuery();

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

  /* ─── Leave request form ─── */

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

    // Use first approver as default if none selected
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
    });
    setLeaveFormLoading(false);

    if (result.success) {
      toast.success("Leave requested successfully!");
      leaveForm.reset();
      router.refresh();
    } else {
      toast.error(result.error || "Failed to submit request");
    }
  }

  /* ─── WFH form ─── */

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

  /* ─── WFH handlers ─── */

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

  const currentYear = new Date().getFullYear();

  return (
    <>
      <motion.div
        className="space-y-6"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {/* ─── Page Header ─── */}
        <motion.div variants={fadeUp}>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">My Leaves</h1>
        </motion.div>

        {/* ─── Who's Out Banner ─── */}
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

        {/* ─── Overview Section ─── */}
        <motion.div variants={fadeUp}>
          <div className="space-y-1 mb-4">
            <h2 className="text-xl font-bold text-foreground">Overview</h2>
            <p className="text-sm text-muted-foreground">
              Track your leave balances and history for the fiscal year {currentYear}.
            </p>
          </div>

          <div className="grid gap-4 grid-cols-2 lg:grid-cols-3" role="list" aria-label="Leave balances">
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
        </motion.div>

        {/* ─── Tabs ─── */}
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

            {/* ─── My Leaves Tab ─── */}
            <TabsContent value="my-leaves" className="space-y-4">
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
                          <div className="overflow-x-auto">
                            <table className="w-full" aria-label="Leave request history">
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
                          <div className="flex flex-col items-center gap-1 py-3 border border-dashed border-border rounded-lg text-muted-foreground">
                            <Paperclip className="h-5 w-5" />
                            <span className="text-xs">Attach documents (Optional)</span>
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
            </TabsContent>

            {/* ─── WFH Tab ─── */}
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
            </TabsContent>

            {/* ─── Approvals Tab ─── */}
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

      {/* ─── Reject WFH Dialog ─── */}
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

      {/* ─── SR Announcements ─── */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {leaveFormLoading && "Submitting leave request..."}
        {createWfhRequest.isPending && "Submitting WFH request..."}
        {processWfhRequest.isPending && "Processing WFH request..."}
      </div>
    </>
  );
}

/* ─── Leave Approvals List ─── */

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
