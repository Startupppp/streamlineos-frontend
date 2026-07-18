"use client";

import { getErrorMessage } from "@/lib/get-error-message";
import { useState, useCallback } from "react";
import {
  useResignations,
  useCreateResignation,
  useHrReviewResignation,
  useCeoReviewResignation,
  useWithdrawResignation,
  type Resignation,
} from "@/hooks/api/hr";
import { apiClient } from "@/lib/api-client";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
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
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";
import { format, addDays } from "date-fns";
import {
  Plus,
  FileText,
  Download,
  CheckCircle2,
  LogOut,
} from "lucide-react";
import { FileUpload } from "@/components/storage/file-upload";
import { EmptyPersonIllustration } from "@/components/illustrations";
import { useSession } from "next-auth/react";
import { useCan } from "@/hooks/api/access";
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
  const { data: resignations, isLoading, isError, refetch } = useResignations();
  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);
  const createResignation = useCreateResignation();
  const hrReview = useHrReviewResignation();
  const ceoReview = useCeoReviewResignation();
  const withdrawResignation = useWithdrawResignation();

  const role = session?.user?.role;
  const userId = session?.user?.id;
  const isAdmin = useCan("hr:exit:manage");
  const isHR = role === "HR";
  const isCEO = useCan("hr:exit:approve");

  const [sheetOpen, setSheetOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonCategory, setReasonCategory] = useState("");
  const [otherReasonCategory, setOtherReasonCategory] = useState("");
  const [willingForExitInterview, setWillingForExitInterview] = useState(false);
  const [companyFeedback, setCompanyFeedback] = useState("");
  const [resignationLetterUrl, setResignationLetterUrl] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

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
    setResignationLetterUrl(null);
    setFormKey((k) => k + 1);
  }, []);

  const handleUploadComplete = useCallback((url: string) => {
    setResignationLetterUrl(url);
  }, []);

  const handleRemoveLetterUrl = useCallback(() => {
    setResignationLetterUrl(null);
  }, []);

  const handleViewLetter = useCallback(async (id: number) => {
    try {
      const data = await apiClient.get<{ html: string }>(`/hr/exit/${id}/letter`);
      const win = window.open("", "_blank");
      if (!win) {
        toast.error("Popup blocked — please allow popups to view the letter.");
        return;
      }
      win.document.write(
        `<!DOCTYPE html><html><head><title>Resignation Letter</title><style>body{margin:0;padding:20px 40px;}</style></head><body>${data.html}</body></html>`
      );
      win.document.close();
    } catch {
      toast.error("Failed to load resignation letter");
    }
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
        resignationLetterUrl: resignationLetterUrl ?? undefined,
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
  }, [reason, reasonCategory, otherReasonCategory, willingForExitInterview, companyFeedback, autoLwd, resignationLetterUrl, createResignation, resetResignationForm]);

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

  const handleOpenSheet = useCallback(() => setSheetOpen(true), []);

  const handleResignationSheetOpenChange = useCallback((open: boolean) => {
    if (!open) resetResignationForm();
    setSheetOpen(open);
  }, [resetResignationForm]);

  const handleReasonChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setReason(e.target.value);
  }, []);

  const handleOtherReasonCategoryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setOtherReasonCategory(e.target.value);
  }, []);

  const handleCompanyFeedbackChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCompanyFeedback(e.target.value);
  }, []);

  const handleRejectRemarksChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setRejectRemarks(e.target.value);
  }, []);

  const handleHrApproveClose = useCallback((open: boolean) => {
    if (!open) setHrApproveId(null);
  }, []);

  const handleCeoApproveClose = useCallback((open: boolean) => {
    if (!open) setCeoApproveId(null);
  }, []);

  const handleRejectRemarksClose = useCallback((open: boolean) => {
    if (!open) {
      setRejectRemarksOpen(false);
      setRejectDialog(null);
      setRejectRemarks("");
    }
  }, []);

  const handleWithdrawClose = useCallback((open: boolean) => {
    if (!open) setWithdrawId(null);
  }, []);

  const handleHrReject = useCallback((id: number) => handleOpenRejectDialog(id, "hr"), [handleOpenRejectDialog]);
  const handleCeoReject = useCallback((id: number) => handleOpenRejectDialog(id, "ceo"), [handleOpenRejectDialog]);

  if (isLoading) {
    return (
      <PageWrapper title="Exit Management" subtitle="Resignations and offboarding" variant="display">
        <div className="flex flex-1 min-h-0 flex-col gap-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper title="Exit Management" subtitle="Resignations and offboarding" variant="display">
        <EmptyState
          illustrationPreset="alert"
          title="Failed to load resignations"
          description="Something went wrong. Please try again."
          action={{ label: "Retry", onClick: handleRetry }}
        />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Exit Management"
      subtitle="Resignations, exit interviews, and offboarding"
      actions={
        !isCEO && !hasActiveResignation ? (
          <Button size="sm" onClick={handleOpenSheet} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Submit Resignation
          </Button>
        ) : hasActiveResignation ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-800">
            Resignation pending
          </span>
        ) : null
      }
    >
      {!resignations?.length ? (
        <EmptyState
          illustration={<EmptyPersonIllustration className="h-24 w-24" />}
          title="No resignations on record"
          description={isCEO || isHR ? "Employee resignations will appear here once submitted." : "Submit a resignation to start the exit process."}
          compact
        />
      ) : (
        <div className="flex flex-1 min-h-0 flex-col gap-2">
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
              onHrReject={handleHrReject}
              onCeoApprove={setCeoApproveId}
              onCeoReject={handleCeoReject}
              onWithdraw={setWithdrawId}
              onViewLetter={handleViewLetter}
            />
          ))}
        </div>
      )}

      <HrSheet
        open={sheetOpen}
        onOpenChange={handleResignationSheetOpenChange}
        title="Submit Resignation"
        onSubmit={handleSubmitResignation}
        submitLabel={
          <span className="flex items-center gap-1.5">
            <LogOut className="h-3.5 w-3.5" />
            Submit Resignation
          </span>
        }
        isPending={createResignation.isPending}
      >
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 flex items-start gap-2.5 text-xs text-foreground">
          <FileText className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>
            Notice period is <strong>60 days</strong> as per
            company policy. Your last working date will be{" "}
            <strong>
              {format(addDays(new Date(), NOTICE_PERIOD_DAYS), "dd MMM yyyy")}
            </strong>
            .
          </span>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-foreground">Reason Category</label>
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
            <label className="text-sm font-semibold text-foreground">
              Specify Reason <span className="text-destructive">*</span>
            </label>
            <Input
              placeholder="Briefly describe your reason..."
              value={otherReasonCategory}
              onChange={handleOtherReasonCategoryChange}
              maxLength={100}
            />
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-foreground">
            Detailed Explanation <span className="text-destructive">*</span>
          </label>
          <Textarea
            placeholder="Please describe your reason for leaving..."
            value={reason}
            onChange={handleReasonChange}
            rows={4}
            maxLength={2000}
            className="resize-none w-full"
          />
          <p className="text-[11px] text-muted-foreground text-right">
            {reason.length} / 2000 (min 50)
          </p>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
          <div>
            <p className="text-sm font-semibold text-foreground">Willing for Exit Interview?</p>
            <p className="text-xs text-muted-foreground mt-0.5">
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
          <label className="text-sm font-semibold text-foreground">
            Company Feedback{" "}
            <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <Textarea
            placeholder="Any feedback about your experience at the company..."
            value={companyFeedback}
            onChange={handleCompanyFeedbackChange}
            rows={3}
            maxLength={1000}
            className="resize-none w-full"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground">
            Resignation Letter{" "}
            <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          {resignationLetterUrl ? (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-500/10 dark:border-emerald-800 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              <span className="flex-1 truncate">Letter uploaded successfully</span>
              <button
                type="button"
                onClick={handleRemoveLetterUrl}
                className="text-emerald-600 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-300 transition-colors duration-200"
                aria-label="Remove uploaded letter"
              >
                ×
              </button>
            </div>
          ) : (
            <FileUpload
              key={formKey}
              folder="resignations"
              accept="application/pdf,image/*,.doc,.docx"
              maxSize={10 * 1024 * 1024}
              onUploadComplete={handleUploadComplete}
            />
          )}
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors duration-200"
          >
            <Download className="h-3 w-3" />
            Download template
          </button>
        </div>
      </HrSheet>

      <ConfirmDialog
        open={hrApproveId !== null}
        onOpenChange={handleHrApproveClose}
        title="Approve Resignation (HR)"
        description="Are you sure you want to approve this resignation? It will be forwarded to the CEO for final approval."
        confirmLabel="Approve"
        onConfirm={handleHrApprove}
        isPending={hrReview.isPending}
      />

      <ConfirmDialog
        open={ceoApproveId !== null}
        onOpenChange={handleCeoApproveClose}
        title="Approve Resignation (CEO)"
        description="Are you sure you want to give final approval for this resignation?"
        confirmLabel="Approve"
        onConfirm={handleCeoApprove}
        isPending={ceoReview.isPending}
      />

      <HrSheet
        open={rejectRemarksOpen}
        onOpenChange={handleRejectRemarksClose}
        title="Reject Resignation"
        onSubmit={handleRejectConfirm}
        submitLabel="Reject"
        isPending={hrReview.isPending || ceoReview.isPending}
      >
        <p className="text-sm text-muted-foreground">
          Provide a reason for rejection. The employee will be notified.
        </p>
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-foreground">
            Remarks <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <Textarea
            placeholder="Enter your rejection remarks..."
            value={rejectRemarks}
            onChange={handleRejectRemarksChange}
            rows={4}
            maxLength={1000}
            className="resize-none w-full"
          />
        </div>
      </HrSheet>

      <ConfirmDialog
        open={withdrawId !== null}
        onOpenChange={handleWithdrawClose}
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
