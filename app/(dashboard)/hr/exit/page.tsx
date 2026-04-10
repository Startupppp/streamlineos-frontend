"use client";

import { getErrorMessage } from "@/lib/get-error-message";
import { useState, useCallback } from "react";
import {
  useResignations,
  useCreateResignation,
  useHrReviewResignation,
  useCeoReviewResignation,
  useWithdrawResignation,
  useResignationProgress,
  type Resignation,
} from "@/lib/api/hooks/hr";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HrSheet } from "@/features/hr/hr-sheet";
import { ConfirmActionDialog } from "@/features/hr/confirm-action-dialog";
import { toast } from "sonner";
import { format, differenceInDays, addDays } from "date-fns";
import { resolveImageUrl } from "@/lib/utils";
import {
  Plus,
  CheckCircle2,
  Clock,
  Calendar,
  FileText,
  Download,
  ChevronDown,
  ChevronUp,
  XCircle,
  Undo2,
} from "lucide-react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";

const NOTICE_PERIOD_DAYS = 60;

const REASON_CATEGORIES = [
  "Better Opportunity",
  "Personal Reasons",
  "Higher Education",
  "Work Environment",
  "Compensation",
  "Role Mismatch",
  "Relocation",
  "Health Issues",
  "Starting Own Venture",
  "Other",
];

function statusBadge(
  status: string | null
): "default" | "secondary" | "outline" | "destructive" {
  if (!status) return "outline";
  if (status === "SUBMITTED" || status === "PENDING_HR") return "outline";
  if (status === "HR_APPROVED") return "secondary";
  if (status === "CEO_APPROVED" || status === "IN_PROGRESS" || status === "COMPLETED" || status === "APPROVED") return "default";
  if (status === "REJECTED" || status === "WITHDRAWN") return "destructive";
  return "outline";
}

const PROGRESS_STEPS = [
  { step: "SUBMITTED", label: "Submitted" },
  { step: "PENDING_HR", label: "HR Review" },
  { step: "HR_APPROVED", label: "HR Approved" },
  { step: "CEO_APPROVED", label: "CEO Approved" },
  { step: "COMPLETED", label: "Completed" },
];

function ProgressTimeline({ id }: { id: number }) {
  const { data, isLoading } = useResignationProgress(id, true);

  if (isLoading) {
    return (
      <div className="flex items-center gap-1 px-4 pb-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-5 w-full rounded-full" />
        ))}
      </div>
    );
  }

  const steps = data?.steps ?? PROGRESS_STEPS.map((s, i) => ({
    ...s,
    status: i === 0 ? ("current" as const) : ("pending" as const),
  }));

  return (
    <div className="px-4 pb-3 pt-1">
      <div className="flex items-center gap-0">
        {steps.map((step, i) => (
          <div key={step.step} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div
                className={cn(
                  "h-4 w-4 rounded-full border-2 transition-colors",
                  step.status === "completed"
                    ? "bg-primary border-primary"
                    : step.status === "current"
                    ? "bg-background border-primary ring-2 ring-primary/30"
                    : "bg-background border-muted-foreground/30"
                )}
              />
              <span
                className={cn(
                  "text-[9px] text-center leading-tight max-w-[52px]",
                  step.status === "completed"
                    ? "text-primary font-medium"
                    : step.status === "current"
                    ? "text-foreground font-medium"
                    : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
              {step.status === "completed" && step.timestamp && (
                <span className="text-[8px] text-muted-foreground">
                  {format(new Date(step.timestamp), "MMM d")}
                </span>
              )}
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "h-0.5 flex-1 mx-1 mb-4",
                  step.status === "completed" ? "bg-primary" : "bg-muted-foreground/20"
                )}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

interface RejectDialogState {
  id: number;
  type: "hr" | "ceo";
}

export default function ExitManagementPage() {
  const { data: session } = useSession();
  const { data: resignations, isLoading } = useResignations();
  const createResignation = useCreateResignation();
  const hrReview = useHrReviewResignation();
  const ceoReview = useCeoReviewResignation();
  const withdrawResignation = useWithdrawResignation();

  const role = session?.user?.role;
  const userId = session?.user?.id;
  const isAdmin = role === "CEO" || role === "HR";
  const isHR = role === "HR";
  const isCEO = role === "CEO";

  // Submission form state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonCategory, setReasonCategory] = useState("");
  const [willingForExitInterview, setWillingForExitInterview] = useState(false);
  const [companyFeedback, setCompanyFeedback] = useState("");

  // HR approve dialog
  const [hrApproveId, setHrApproveId] = useState<number | null>(null);

  // CEO approve dialog
  const [ceoApproveId, setCeoApproveId] = useState<number | null>(null);

  // Reject dialog with remarks
  const [rejectDialog, setRejectDialog] = useState<RejectDialogState | null>(null);
  const [rejectRemarks, setRejectRemarks] = useState("");
  const [rejectRemarksOpen, setRejectRemarksOpen] = useState(false);

  // Withdraw confirm
  const [withdrawId, setWithdrawId] = useState<number | null>(null);

  // Expanded cards for progress timeline
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const autoLwd = format(addDays(new Date(), NOTICE_PERIOD_DAYS), "yyyy-MM-dd");

  const toggleExpand = useCallback((id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSubmitResignation = useCallback(() => {
    if (!reason.trim()) {
      toast.error("Detailed explanation is required");
      return;
    }
    createResignation.mutate(
      {
        reason: reason.trim(),
        lastWorkingDate: autoLwd,
        noticePeriodDays: NOTICE_PERIOD_DAYS,
        reasonCategory: reasonCategory || undefined,
        willingForExitInterview,
        companyFeedback: companyFeedback.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Resignation submitted");
          setSheetOpen(false);
          setReason("");
          setReasonCategory("");
          setWillingForExitInterview(false);
          setCompanyFeedback("");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }, [reason, reasonCategory, willingForExitInterview, companyFeedback, autoLwd, createResignation]);

  const handleHrApprove = useCallback(() => {
    if (!hrApproveId) return;
    hrReview.mutate(
      { id: hrApproveId, action: "approve" },
      {
        onSuccess: () => {
          toast.success("Resignation approved by HR");
          setHrApproveId(null);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }, [hrApproveId, hrReview]);

  const handleCeoApprove = useCallback(() => {
    if (!ceoApproveId) return;
    ceoReview.mutate(
      { id: ceoApproveId, action: "approve" },
      {
        onSuccess: () => {
          toast.success("Resignation approved by CEO");
          setCeoApproveId(null);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }, [ceoApproveId, ceoReview]);

  const handleOpenRejectDialog = useCallback((id: number, type: "hr" | "ceo") => {
    setRejectDialog({ id, type });
    setRejectRemarks("");
    setRejectRemarksOpen(true);
  }, []);

  const handleRejectConfirm = useCallback(() => {
    if (!rejectDialog) return;
    const mutate = rejectDialog.type === "hr" ? hrReview.mutate : ceoReview.mutate;
    mutate(
      { id: rejectDialog.id, action: "reject", remarks: rejectRemarks.trim() || undefined },
      {
        onSuccess: () => {
          toast.success("Resignation rejected");
          setRejectRemarksOpen(false);
          setRejectDialog(null);
          setRejectRemarks("");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }, [rejectDialog, rejectRemarks, hrReview, ceoReview]);

  const handleWithdraw = useCallback(() => {
    if (!withdrawId) return;
    withdrawResignation.mutate(
      { id: withdrawId },
      {
        onSuccess: () => {
          toast.success("Resignation withdrawn");
          setWithdrawId(null);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }, [withdrawId, withdrawResignation]);

  if (isLoading) {
    return (
      <PageWrapper title="Exit Management" subtitle="Resignations and offboarding">
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Exit Management"
      subtitle="Resignations, exit interviews, and offboarding"
      badge={`${resignations?.length ?? 0} records`}
      actions={
        <Button size="sm" onClick={() => setSheetOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          Submit Resignation
        </Button>
      }
    >
      {!resignations?.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Image
              src="/illustrations/undraw-quitting-time.svg"
              alt="No resignations"
              width={200}
              height={160}
              className="mx-auto mb-4 opacity-90"
            />
            <p className="text-sm text-muted-foreground">No resignations on record.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {resignations.map((r: Resignation) => {
            const daysLeft =
              r.lastWorkingDate
                ? differenceInDays(new Date(r.lastWorkingDate), new Date())
                : null;
            const isExpanded = expandedIds.has(r.id);
            const isOwnRecord = r.userId === userId;
            const canWithdraw =
              !isAdmin &&
              isOwnRecord &&
              (r.status === "SUBMITTED" || r.status === "PENDING_HR");
            const hrCanAct =
              isHR &&
              (r.status === "SUBMITTED" || r.status === "PENDING_HR");
            const ceoCanAct = isCEO && r.status === "HR_APPROVED";

            return (
              <Card key={r.id} className="overflow-hidden">
                <CardContent className="p-4 flex items-center gap-4">
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarImage src={resolveImageUrl(r.user?.image ?? null)} />
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {r.user?.name?.[0] ?? "?"}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold truncate">
                        {r.user?.name ?? "Employee"}
                      </p>
                      <Badge variant={statusBadge(r.status)} className="text-[10px]">
                        {r.status}
                      </Badge>
                      {r.reasonCategory && (
                        <Badge variant="outline" className="text-[9px] hidden sm:inline-flex">
                          {r.reasonCategory}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-0.5 flex-wrap">
                      {r.user?.designation && <span>{r.user.designation}</span>}
                      {r.lastWorkingDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          LWD: {format(new Date(r.lastWorkingDate), "MMM d, yyyy")}
                        </span>
                      )}
                      {daysLeft !== null && daysLeft > 0 && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {daysLeft} days left
                        </span>
                      )}
                      <span>{r.noticePeriodDays}d notice</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* HR review actions */}
                    {hrCanAct && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => setHrApproveId(r.id)}
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs text-destructive hover:text-destructive"
                          onClick={() => handleOpenRejectDialog(r.id, "hr")}
                        >
                          <XCircle className="h-3 w-3 mr-1" />
                          Reject
                        </Button>
                      </>
                    )}

                    {/* CEO review actions */}
                    {ceoCanAct && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => setCeoApproveId(r.id)}
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs text-destructive hover:text-destructive"
                          onClick={() => handleOpenRejectDialog(r.id, "ceo")}
                        >
                          <XCircle className="h-3 w-3 mr-1" />
                          Reject
                        </Button>
                      </>
                    )}

                    {/* Employee withdraw */}
                    {canWithdraw && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => setWithdrawId(r.id)}
                      >
                        <Undo2 className="h-3 w-3 mr-1" />
                        Withdraw
                      </Button>
                    )}

                    {/* Expand/collapse */}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      aria-label={isExpanded ? "Collapse progress" : "Expand progress"}
                      onClick={() => toggleExpand(r.id)}
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </CardContent>

                {/* Collapsible progress timeline */}
                {isExpanded && (
                  <div className="border-t bg-muted/20">
                    <ProgressTimeline id={r.id} />
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Submission sheet */}
      <HrSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title="Submit Resignation"
        onSubmit={handleSubmitResignation}
        submitLabel="Submit"
        isPending={createResignation.isPending}
      >
        <div className="rounded-md border border-border bg-muted/40 px-3 py-2.5 flex items-start gap-2.5 text-xs text-muted-foreground">
          <FileText className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>
            Notice period is <strong className="text-foreground">60 days</strong> as per
            company policy. Your last working date will be{" "}
            <strong className="text-foreground">
              {format(addDays(new Date(), NOTICE_PERIOD_DAYS), "dd MMM yyyy")}
            </strong>
            .
          </span>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Reason Category</label>
          <Select value={reasonCategory} onValueChange={setReasonCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Select a category..." />
            </SelectTrigger>
            <SelectContent>
              {REASON_CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            Detailed Explanation <span className="text-destructive">*</span>
          </label>
          <Textarea
            placeholder="Please describe your reason for leaving..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
          />
        </div>

        <div className="flex items-center justify-between rounded-md border px-3 py-2.5">
          <div>
            <p className="text-sm font-medium">Willing for Exit Interview?</p>
            <p className="text-xs text-muted-foreground">
              We&apos;d love to hear your feedback in person.
            </p>
          </div>
          <Switch
            checked={willingForExitInterview}
            onCheckedChange={setWillingForExitInterview}
            aria-label="Willing for exit interview"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            Company Feedback{" "}
            <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <Textarea
            placeholder="Any feedback about your experience at the company..."
            value={companyFeedback}
            onChange={(e) => setCompanyFeedback(e.target.value)}
            rows={3}
          />
        </div>

        <div className="pt-1">
          <p className="text-xs text-muted-foreground mb-2">
            Need a template? Download and attach your formal resignation letter:
          </p>
          <a
            href="/Resignation Letter Template.docx"
            download
            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
          >
            <Download className="h-3 w-3" />
            Download Resignation Letter Template
          </a>
        </div>
      </HrSheet>

      {/* HR approve confirmation */}
      <ConfirmActionDialog
        open={hrApproveId !== null}
        onOpenChange={(open) => {
          if (!open) setHrApproveId(null);
        }}
        title="Approve Resignation (HR)"
        description="Are you sure you want to approve this resignation? It will be forwarded to the CEO for final approval."
        confirmLabel="Approve"
        variant="default"
        onConfirm={handleHrApprove}
        isPending={hrReview.isPending}
      />

      {/* CEO approve confirmation */}
      <ConfirmActionDialog
        open={ceoApproveId !== null}
        onOpenChange={(open) => {
          if (!open) setCeoApproveId(null);
        }}
        title="Approve Resignation (CEO)"
        description="Are you sure you want to give final approval for this resignation?"
        confirmLabel="Approve"
        variant="default"
        onConfirm={handleCeoApprove}
        isPending={ceoReview.isPending}
      />

      {/* Reject dialog with remarks */}
      <HrSheet
        open={rejectRemarksOpen}
        onOpenChange={(open) => {
          if (!open) {
            setRejectRemarksOpen(false);
            setRejectDialog(null);
            setRejectRemarks("");
          }
        }}
        title="Reject Resignation"
        onSubmit={handleRejectConfirm}
        submitLabel="Reject"
        isPending={hrReview.isPending || ceoReview.isPending}
      >
        <p className="text-sm text-muted-foreground">
          Provide a reason for rejection. The employee will be notified.
        </p>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            Remarks <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <Textarea
            placeholder="Enter your rejection remarks..."
            value={rejectRemarks}
            onChange={(e) => setRejectRemarks(e.target.value)}
            rows={4}
          />
        </div>
      </HrSheet>

      {/* Withdraw confirmation */}
      <ConfirmActionDialog
        open={withdrawId !== null}
        onOpenChange={(open) => {
          if (!open) setWithdrawId(null);
        }}
        title="Withdraw Resignation"
        description="Are you sure you want to withdraw your resignation? This action cannot be undone."
        confirmLabel="Withdraw"
        variant="destructive"
        onConfirm={handleWithdraw}
        isPending={withdrawResignation.isPending}
      />
    </PageWrapper>
  );
}
