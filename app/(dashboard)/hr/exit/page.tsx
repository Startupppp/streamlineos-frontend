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
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HrSheet } from "@/features/hr/hr-sheet";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { format, addDays } from "date-fns";
import {
  Plus,
  FileText,
  Download,
} from "lucide-react";
import { EmptyPersonIllustration } from "@/components/illustrations";
import { useSession } from "next-auth/react";
import { useAbility } from "@/lib/abilities-context";
import { cn } from "@/lib/utils";
import { ResignationCard } from "@/features/hr/exit/resignation-card";
import { RESIGNATION_REASONS, RESIGNATION_REASON_OTHER } from "@/lib/constants/hr-separation";

const NOTICE_PERIOD_DAYS = 60;

const REASON_CATEGORIES = [...RESIGNATION_REASONS];

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
  const ability = useAbility();
  const isAdmin = ability.can("approve", "hr:leaves");
  const isHR = role === "HR";
  const isCEO = ability.can("manage", "all");

  const [sheetOpen, setSheetOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonCategory, setReasonCategory] = useState("");
  const [otherReasonCategory, setOtherReasonCategory] = useState("");
  const [willingForExitInterview, setWillingForExitInterview] = useState(false);
  const [companyFeedback, setCompanyFeedback] = useState("");

  const [hrApproveId, setHrApproveId] = useState<number | null>(null);

  const [ceoApproveId, setCeoApproveId] = useState<number | null>(null);

  const [rejectDialog, setRejectDialog] = useState<RejectDialogState | null>(null);
  const [rejectRemarks, setRejectRemarks] = useState("");
  const [rejectRemarksOpen, setRejectRemarksOpen] = useState(false);

  const [withdrawId, setWithdrawId] = useState<number | null>(null);

  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const autoLwd = format(addDays(new Date(), NOTICE_PERIOD_DAYS), "yyyy-MM-dd");

  const hasActiveResignation = resignations?.some(
    (r: Resignation) => r.userId === userId && ["SUBMITTED", "PENDING_HR", "HR_APPROVED"].includes(r.status ?? ""),
  ) ?? false;

  const toggleExpand = useCallback((id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const resetResignationForm = useCallback(() => {
    setReason("");
    setReasonCategory("");
    setOtherReasonCategory("");
    setWillingForExitInterview(false);
    setCompanyFeedback("");
  }, []);

  const handleSubmitResignation = useCallback(() => {
    if (!reasonCategory) {
      toast.error("Please select a reason category");
      return;
    }
    if (reasonCategory === RESIGNATION_REASON_OTHER && !otherReasonCategory.trim()) {
      toast.error("Please specify your reason for selecting 'Other'");
      return;
    }
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      toast.error("Detailed explanation is required");
      return;
    }
    if (trimmedReason.length < 50) {
      toast.error("Detailed explanation must be at least 50 characters");
      return;
    }
    if (trimmedReason.length > 2000) {
      toast.error("Detailed explanation must be at most 2000 characters");
      return;
    }
    const resolvedCategory = reasonCategory === RESIGNATION_REASON_OTHER
      ? otherReasonCategory.trim()
      : reasonCategory;
    createResignation.mutate(
      {
        reason: trimmedReason,
        lastWorkingDate: autoLwd,
        noticePeriodDays: NOTICE_PERIOD_DAYS,
        reasonCategory: resolvedCategory || undefined,
        willingForExitInterview,
        companyFeedback: companyFeedback.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Resignation submitted");
          setSheetOpen(false);
          resetResignationForm();
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }, [reason, reasonCategory, otherReasonCategory, willingForExitInterview, companyFeedback, autoLwd, createResignation, resetResignationForm]);

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

  const handleDownloadTemplate = useCallback(() => {
    const content = [
      "RESIGNATION LETTER TEMPLATE",
      "",
      "[Date]",
      "",
      "To,",
      "The Management,",
      "[Company Name]",
      "",
      "Subject: Resignation from the position of [Your Job Title]",
      "",
      "Dear [Manager's Name],",
      "",
      "I am writing to formally inform you of my decision to resign from my position as [Your Job Title] at [Company Name], effective [Last Working Date].",
      "",
      "Reason for leaving: [Briefly state your reason]",
      "",
      "I am grateful for the opportunities I have had during my tenure at [Company Name]. I will ensure a smooth handover of my responsibilities during the notice period.",
      "",
      "Thank you for your support and guidance.",
      "",
      "Sincerely,",
      "[Your Name]",
      "[Employee ID]",
      "[Date]",
    ].join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Resignation_Letter_Template.txt";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

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
        !isCEO && !hasActiveResignation ? (
          <Button size="sm" onClick={() => setSheetOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Submit Resignation
          </Button>
        ) : hasActiveResignation ? (
          <p className="text-xs text-muted-foreground">You have a pending resignation.</p>
        ) : null
      }
    >
      {!resignations?.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <EmptyPersonIllustration className="mx-auto mb-4 h-40 w-40 opacity-95" />
            <p className="text-sm text-muted-foreground">No resignations on record.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {resignations.map((r: Resignation) => (
            <ResignationCard
              key={r.id}
              resignation={r}
              isExpanded={expandedIds.has(r.id)}
              isAdmin={isAdmin}
              isHR={isHR}
              isCEO={isCEO}
              userId={userId}
              onToggleExpand={toggleExpand}
              onHrApprove={setHrApproveId}
              onHrReject={(id) => handleOpenRejectDialog(id, "hr")}
              onCeoApprove={setCeoApproveId}
              onCeoReject={(id) => handleOpenRejectDialog(id, "ceo")}
              onWithdraw={setWithdrawId}
            />
          ))}
        </div>
      )}

      <HrSheet
        open={sheetOpen}
        onOpenChange={(open) => { if (!open) resetResignationForm(); setSheetOpen(open); }}
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
            <SelectContent className="w-[var(--radix-select-trigger-width)]">
              {REASON_CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {reasonCategory === RESIGNATION_REASON_OTHER && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Specify Reason <span className="text-destructive">*</span>
            </label>
            <Input
              placeholder="Briefly describe your reason..."
              value={otherReasonCategory}
              onChange={(e) => setOtherReasonCategory(e.target.value)}
              maxLength={100}
            />
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            Detailed Explanation <span className="text-destructive">*</span>
          </label>
          <Textarea
            placeholder="Please describe your reason for leaving..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            maxLength={2000}
            className="resize-none w-full"
          />
          <p className="text-[11px] text-muted-foreground text-right">
            {reason.length} / 2000 (min 50)
          </p>
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
            maxLength={1000}
            className="resize-none w-full"
          />
        </div>

        <div className="pt-1">
          <p className="text-xs text-muted-foreground mb-2">
            Need a template? Download and attach your formal resignation letter:
          </p>
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 hover:underline"
          >
            <Download className="h-3 w-3" />
            Download Resignation Letter Template
          </button>
        </div>
      </HrSheet>

      <ConfirmDialog
        open={hrApproveId !== null}
        onOpenChange={(open) => {
          if (!open) setHrApproveId(null);
        }}
        title="Approve Resignation (HR)"
        description="Are you sure you want to approve this resignation? It will be forwarded to the CEO for final approval."
        confirmLabel="Approve"
        onConfirm={handleHrApprove}
        isPending={hrReview.isPending}
      />

      <ConfirmDialog
        open={ceoApproveId !== null}
        onOpenChange={(open) => {
          if (!open) setCeoApproveId(null);
        }}
        title="Approve Resignation (CEO)"
        description="Are you sure you want to give final approval for this resignation?"
        confirmLabel="Approve"
        onConfirm={handleCeoApprove}
        isPending={ceoReview.isPending}
      />

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
            maxLength={1000}
            className="resize-none w-full"
          />
        </div>
      </HrSheet>

      <ConfirmDialog
        open={withdrawId !== null}
        onOpenChange={(open) => {
          if (!open) setWithdrawId(null);
        }}
        title="Withdraw Resignation"
        description="Are you sure you want to withdraw your resignation? This action cannot be undone."
        confirmLabel="Withdraw"
        destructive
        onConfirm={handleWithdraw}
        isPending={withdrawResignation.isPending}
      />
    </PageWrapper>
  );
}
