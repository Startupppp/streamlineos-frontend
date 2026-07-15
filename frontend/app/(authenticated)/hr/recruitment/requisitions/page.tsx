"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  useJobRequisitions,
  useCreateJobRequisition,
  useSubmitRequisition,
  useApproveRequisition,
  useRejectRequisition,
  useCreateJobFromRequisition,
} from "@/hooks/api/hr/requisitions";
import type { JobRequisition } from "@/hooks/api/hr/requisitions";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";

import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetBody, SheetFooter,
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  Plus, MapPin, Users, Calendar, DollarSign, CheckCircle2, XCircle, Send,
  Briefcase, ChevronRight, MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { EmptyApprovalIllustration } from "@/components/illustrations";
import { RecruitmentEmptyState } from "@/features/hr/recruitment/components/recruitment-empty-state";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";

const STATUS_TABS = [
  { label: "All", value: undefined },
  { label: "Draft", value: "DRAFT" },
  { label: "Pending Approval", value: "PENDING_APPROVAL" },
  { label: "Approved", value: "APPROVED" },
  { label: "Closed", value: "CLOSED" },
];

const PRIORITY_STYLES: Record<string, string> = {
  LOW: "bg-muted text-muted-foreground border-border",
  MEDIUM: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  HIGH: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  URGENT: "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30",
};

const STATUS_STYLES: Record<string, { badge: string; label: string; dot: string }> = {
  DRAFT: { badge: "bg-muted text-muted-foreground border-border", label: "Draft", dot: "bg-muted-foreground/50" },
  PENDING_APPROVAL: { badge: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30", label: "Pending Approval", dot: "bg-amber-500" },
  APPROVED: { badge: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30", label: "Approved", dot: "bg-emerald-500" },
  PUBLISHED: { badge: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30", label: "Published", dot: "bg-blue-500" },
  CLOSED: { badge: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/30", label: "Closed", dot: "bg-rose-400" },
  REJECTED: { badge: "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30", label: "Rejected", dot: "bg-red-500" },
};

const TYPE_LABELS: Record<string, string> = {
  FULL_TIME: "Full Time",
  PART_TIME: "Part Time",
  CONTRACT: "Contract",
};

const requisitionSchema = z.object({
  title: z.string().min(2, "Title is required"),
  department: z.string().optional(),
  location: z.string().optional(),
  headcount: z.number().int().min(1, "At least 1"),
  budgetMin: z.string().optional(),
  budgetMax: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  type: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT"]),
  justification: z.string().optional(),
  targetDate: z.string().optional(),
});

type RequisitionFormValues = z.infer<typeof requisitionSchema>;

function RequisitionCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-border/60">
        <Skeleton className="h-3 w-28" />
        <div className="flex gap-2">
          <Skeleton className="h-7 w-16 rounded-lg" />
          <Skeleton className="h-7 w-24 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

interface RejectDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  isPending: boolean;
}

function RejectDialog({ open, onClose, onConfirm, isPending }: RejectDialogProps) {
  const [reason, setReason] = useState("");

  function handleReasonChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setReason(e.target.value);
  }

  function handleConfirm() {
    onConfirm(reason);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reject Requisition</DialogTitle>
          <DialogDescription>Provide a reason for rejecting this requisition.</DialogDescription>
        </DialogHeader>
        <Textarea
          placeholder="Rejection reason..."
          className="min-h-[100px]"
          value={reason}
          onChange={handleReasonChange}
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={!reason.trim() || isPending}>
            {isPending ? "Rejecting…" : "Reject"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface CreateRequisitionSheetProps {
  open: boolean;
  onClose: () => void;
}

function CreateRequisitionSheet({ open, onClose }: CreateRequisitionSheetProps) {
  const createRequisition = useCreateJobRequisition();
  const submitRequisition = useSubmitRequisition();

  const form = useForm<RequisitionFormValues>({
    resolver: zodResolver(requisitionSchema),
    defaultValues: {
      title: "",
      department: "",
      location: "",
      headcount: 1,
      budgetMin: "",
      budgetMax: "",
      priority: "MEDIUM",
      type: "FULL_TIME",
      justification: "",
      targetDate: "",
    },
  });

  async function handleSaveDraft(values: RequisitionFormValues) {
    createRequisition.mutate(
      {
        title: values.title,
        department: values.department || undefined,
        location: values.location || undefined,
        headcount: values.headcount,
        budgetMin: values.budgetMin || undefined,
        budgetMax: values.budgetMax || undefined,
        priority: values.priority,
        type: values.type,
        justification: values.justification || undefined,
        targetDate: values.targetDate || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Requisition saved as draft");
          form.reset();
          onClose();
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }

  async function handleSubmitForApproval(values: RequisitionFormValues) {
    createRequisition.mutate(
      {
        title: values.title,
        department: values.department || undefined,
        location: values.location || undefined,
        headcount: values.headcount,
        budgetMin: values.budgetMin || undefined,
        budgetMax: values.budgetMax || undefined,
        priority: values.priority,
        type: values.type,
        justification: values.justification || undefined,
        targetDate: values.targetDate || undefined,
      },
      {
        onSuccess: (created) => {
          submitRequisition.mutate(created.id, {
            onSuccess: () => {
              toast.success("Requisition submitted for approval");
              form.reset();
              onClose();
            },
            onError: (e) => toast.error(getErrorMessage(e)),
          });
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }

  const isPending = createRequisition.isPending || submitRequisition.isPending;

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent className="w-full sm:max-w-xl flex flex-col p-0 gap-0">
        <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
          <SheetTitle>New Job Requisition</SheetTitle>
          <SheetDescription>Create a headcount request for approval</SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <SheetBody className="px-6 py-5 space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Job Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Senior Software Engineer" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department</FormLabel>
                    <FormControl>
                      <Input placeholder="Engineering" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input placeholder="Remote / City" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <FormField
                control={form.control}
                name="headcount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Headcount</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.valueAsNumber)}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="budgetMin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Min Budget</FormLabel>
                    <FormControl>
                      <Input placeholder="50000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="budgetMax"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Budget</FormLabel>
                    <FormControl>
                      <Input placeholder="80000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="LOW">Low</SelectItem>
                        <SelectItem value="MEDIUM">Medium</SelectItem>
                        <SelectItem value="HIGH">High</SelectItem>
                        <SelectItem value="URGENT">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employment Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="FULL_TIME">Full Time</SelectItem>
                        <SelectItem value="PART_TIME">Part Time</SelectItem>
                        <SelectItem value="CONTRACT">Contract</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="targetDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Hire Date</FormLabel>
                  <FormControl>
                    <DatePicker value={field.value ?? ""} onChange={field.onChange} placeholder="Pick a date" className="h-8 text-sm" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="justification"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Business Justification</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Why is this hire needed?"
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </SheetBody>
        </Form>

        <SheetFooter className="shrink-0 px-6 py-4 border-t flex-row gap-2 justify-end">
          <Button variant="outline" onClick={form.handleSubmit(handleSaveDraft)} disabled={isPending} className="flex-1">
            Save Draft
          </Button>
          <Button
            onClick={form.handleSubmit(handleSubmitForApproval)}
            disabled={isPending}
            className="flex-1"
          >
            <Send className="mr-1.5 h-3.5 w-3.5" />
            {isPending ? "Submitting…" : "Submit for Approval"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

interface RequisitionCardProps {
  req: JobRequisition;
  onSubmit: (id: number) => void;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  onConvertToJob: (id: number) => void;
  isSubmitting: boolean;
  isApproving: boolean;
  isConverting: boolean;
}

function RequisitionCard({
  req,
  onSubmit,
  onApprove,
  onReject,
  onConvertToJob,
  isSubmitting,
  isApproving,
  isConverting,
}: RequisitionCardProps) {
  const statusStyle = STATUS_STYLES[req.status] ?? STATUS_STYLES.DRAFT;
  const priorityStyle = PRIORITY_STYLES[req.priority] ?? PRIORITY_STYLES.MEDIUM;
  const alreadyConverted = !!req.linkedJobId;

  function handleSubmitClick() {
    onSubmit(req.id);
  }

  function handleApproveClick() {
    onApprove(req.id);
  }

  function handleRejectClick() {
    onReject(req.id);
  }

  function handleConvertToJob() {
    onConvertToJob(req.id);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="group relative rounded-2xl border border-border bg-card/90 backdrop-blur-sm shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className={cn("h-2 w-2 rounded-full shrink-0", statusStyle.dot)} />
              <h3 className="text-sm font-semibold text-foreground truncate">{req.title}</h3>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {req.department && (
                <span className="flex items-center gap-1">
                  <Briefcase className="h-3 w-3" />
                  {req.department}
                </span>
              )}
              {req.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {req.location}
                </span>
              )}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {req.status === "DRAFT" && (
                <>
                  <DropdownMenuItem onClick={handleSubmitClick} disabled={isSubmitting}>
                    <Send className="mr-2 h-3.5 w-3.5" /> Submit for Approval
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              {req.status === "PENDING_APPROVAL" && (
                <>
                  <DropdownMenuItem onClick={handleApproveClick} disabled={isApproving}>
                    <CheckCircle2 className="mr-2 h-3.5 w-3.5 text-emerald-600" /> Approve
                  </DropdownMenuItem>
                  <DropdownMenuItem variant="destructive" onClick={handleRejectClick}>
                    <XCircle className="mr-2 h-3.5 w-3.5" /> Reject
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              {req.status === "APPROVED" && !alreadyConverted && (
                <>
                  <DropdownMenuItem onClick={handleConvertToJob} disabled={isConverting}>
                    <ChevronRight className="mr-2 h-3.5 w-3.5" /> Convert to Job Posting
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-4">
          <span className={cn("inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border", statusStyle.badge)}>
            {statusStyle.label}
          </span>
          <span className={cn("inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border", priorityStyle)}>
            {req.priority}
          </span>
          <span className="inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            {TYPE_LABELS[req.type] ?? req.type}
          </span>
        </div>

        {req.status === "REJECTED" && req.rejectionReason && (
          <p className="text-xs text-rose-600 bg-rose-50 rounded-lg px-3 py-2 mb-3 line-clamp-2 dark:bg-rose-500/10 dark:text-rose-300">
            {req.rejectionReason}
          </p>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-border/50 gap-3">
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              <span className="font-semibold text-foreground">{req.headcount}</span> hires
            </span>
            {(req.budgetMin || req.budgetMax) && (
              <span className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                {req.budgetMin && req.budgetMax
                  ? `${Number(req.budgetMin).toLocaleString()} – ${Number(req.budgetMax).toLocaleString()}`
                  : req.budgetMin
                  ? `From ${Number(req.budgetMin).toLocaleString()}`
                  : `Up to ${Number(req.budgetMax).toLocaleString()}`}
              </span>
            )}
            {req.targetDate && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {req.targetDate}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {req.status === "DRAFT" && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={handleSubmitClick}
                disabled={isSubmitting}
              >
                <Send className="mr-1 h-3 w-3" />
                Submit
              </Button>
            )}
            {req.status === "PENDING_APPROVAL" && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500/30 dark:text-emerald-300 dark:hover:bg-emerald-500/10"
                  onClick={handleApproveClick}
                  disabled={isApproving}
                >
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-300 dark:hover:bg-rose-500/10"
                  onClick={handleRejectClick}
                >
                  <XCircle className="mr-1 h-3 w-3" />
                  Reject
                </Button>
              </>
            )}
            {req.status === "APPROVED" && (
              <Button
                size="sm"
                className="h-7 text-xs"
                onClick={handleConvertToJob}
                disabled={isConverting || alreadyConverted}
              >
                <ChevronRight className="mr-1 h-3 w-3" />
                {alreadyConverted ? "Job created" : isConverting ? "Creating…" : "Create Job"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function RequisitionsPage() {
  const router = useRouter();
  const [activeStatus, setActiveStatus] = useState<string | undefined>(undefined);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<number | null>(null);

  const { data: requisitions, isLoading, isError, refetch } = useJobRequisitions(activeStatus);
  const submitRequisition = useSubmitRequisition();
  const approveRequisition = useApproveRequisition();
  const rejectRequisition = useRejectRequisition();
  const createJobFromRequisition = useCreateJobFromRequisition();

  const handleOpenSheet = useCallback(() => setSheetOpen(true), []);
  const handleCloseSheet = useCallback(() => setSheetOpen(false), []);

  const handleSubmit = useCallback(
    (id: number) => {
      submitRequisition.mutate(id, {
        onSuccess: () => toast.success("Requisition submitted for approval"),
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    },
    [submitRequisition]
  );

  const handleApprove = useCallback(
    (id: number) => {
      approveRequisition.mutate(id, {
        onSuccess: () => toast.success("Requisition approved"),
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    },
    [approveRequisition]
  );

  const handleConvertToJob = useCallback(
    (id: number) => {
      createJobFromRequisition.mutate(id, {
        onSuccess: (data) => {
          toast.success(`Job posting "${data.jobTitle}" created`);
          router.push(`/hr/recruitment/jobs/${data.jobId}/edit`);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    },
    [createJobFromRequisition, router]
  );

  const handleRejectOpen = useCallback((id: number) => setRejectTarget(id), []);
  const handleRejectClose = useCallback(() => setRejectTarget(null), []);

  const handleRejectConfirm = useCallback(
    (reason: string) => {
      if (!rejectTarget) return;
      rejectRequisition.mutate(
        { id: rejectTarget, reason },
        {
          onSuccess: () => {
            toast.success("Requisition rejected");
            setRejectTarget(null);
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        }
      );
    },
    [rejectTarget, rejectRequisition]
  );

  const isEmpty = !isLoading && !isError && (!requisitions || requisitions.length === 0);

  return (
    <>
      <PageWrapper
        title="Job Requisitions"
        subtitle="Manage headcount requests and approvals"
        badge={requisitions ? `${requisitions.length}` : undefined}
        actions={
          <Button size="sm" onClick={handleOpenSheet}>
            <Plus className="mr-1.5 h-4 w-4" /> New Requisition
          </Button>
        }
        filters={
          <div className="flex items-center gap-1">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.label}
                onClick={() => setActiveStatus(tab.value)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                  activeStatus === tab.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        }
      >
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <RequisitionCardSkeleton key={i} />
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <p className="text-sm font-semibold text-foreground">Failed to load requisitions</p>
            <p className="text-xs text-muted-foreground">An error occurred while fetching data.</p>
            <Button size="sm" variant="outline" onClick={() => void refetch()}>Try again</Button>
          </div>
        ) : isEmpty ? (
          <RecruitmentEmptyState
            illustration={<EmptyApprovalIllustration />}
            title={
              activeStatus
                ? `No ${STATUS_STYLES[activeStatus]?.label ?? activeStatus} requisitions`
                : "No requisitions yet"
            }
            description={
              activeStatus
                ? "Try another status filter or create a new requisition."
                : "Create your first headcount request to get started."
            }
            action={{ label: "New Requisition", onClick: handleOpenSheet }}
            className={CONTENT_FILL_PANEL}
          />
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {requisitions?.map((req) => (
                <RequisitionCard
                  key={req.id}
                  req={req}
                  onSubmit={handleSubmit}
                  onApprove={handleApprove}
                  onReject={handleRejectOpen}
                  onConvertToJob={handleConvertToJob}
                  isSubmitting={submitRequisition.isPending}
                  isApproving={approveRequisition.isPending}
                  isConverting={createJobFromRequisition.isPending}
                />
              ))}
            </div>
          </AnimatePresence>
        )}
      </PageWrapper>

      <CreateRequisitionSheet open={sheetOpen} onClose={handleCloseSheet} />

      <RejectDialog
        open={rejectTarget !== null}
        onClose={handleRejectClose}
        onConfirm={handleRejectConfirm}
        isPending={rejectRequisition.isPending}
      />
    </>
  );
}
