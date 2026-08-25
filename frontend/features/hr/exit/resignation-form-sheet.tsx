"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { format, addDays } from "date-fns";
import { FileText, Download, CheckCircle2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HrSheet } from "@/features/hr/hr-sheet";
import { FileUpload } from "@/components/storage/file-upload";
import { useCreateResignation } from "@/hooks/api/hr";
import { getErrorMessage } from "@/lib/get-error-message";
import { RESIGNATION_REASONS, RESIGNATION_REASON_OTHER } from "@/lib/constants/hr-separation";

const NOTICE_PERIOD_DAYS = 60;

interface ResignationFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ResignationFormSheet({ open, onOpenChange }: ResignationFormSheetProps) {
  const createResignation = useCreateResignation();

  const [reason, setReason] = useState("");
  const [reasonCategory, setReasonCategory] = useState("");
  const [otherReasonCategory, setOtherReasonCategory] = useState("");
  const [willingForExitInterview, setWillingForExitInterview] = useState(false);
  const [companyFeedback, setCompanyFeedback] = useState("");
  const [resignationLetterUrl, setResignationLetterUrl] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

  const autoLwd = format(addDays(new Date(), NOTICE_PERIOD_DAYS), "yyyy-MM-dd");

  const resetForm = useCallback(() => {
    setReason("");
    setReasonCategory("");
    setOtherReasonCategory("");
    setWillingForExitInterview(false);
    setCompanyFeedback("");
    setResignationLetterUrl(null);
    setFormKey((k) => k + 1);
  }, []);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) resetForm();
      onOpenChange(next);
    },
    [resetForm, onOpenChange],
  );

  const handleUploadComplete = useCallback((_url: string, key: string) => {
    setResignationLetterUrl(key);
  }, []);

  const handleRemoveLetterUrl = useCallback(() => {
    setResignationLetterUrl(null);
  }, []);

  const handleReasonChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setReason(e.target.value);
  }, []);

  const handleOtherReasonCategoryChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setOtherReasonCategory(e.target.value);
    },
    [],
  );

  const handleCompanyFeedbackChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setCompanyFeedback(e.target.value);
    },
    [],
  );

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

  const handleSubmit = useCallback(() => {
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
    const resolvedCategory =
      reasonCategory === RESIGNATION_REASON_OTHER
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
          onOpenChange(false);
          resetForm();
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [
    reason,
    reasonCategory,
    otherReasonCategory,
    willingForExitInterview,
    companyFeedback,
    autoLwd,
    resignationLetterUrl,
    createResignation,
    resetForm,
    onOpenChange,
  ]);

  return (
    <HrSheet
      open={open}
      onOpenChange={handleOpenChange}
      title="Submit Resignation"
      onSubmit={handleSubmit}
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
          Notice period is <strong>60 days</strong> as per company policy. Your last working date
          will be{" "}
          <strong>{format(addDays(new Date(), NOTICE_PERIOD_DAYS), "dd MMM yyyy")}</strong>.
        </span>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-foreground">Reason Category</label>
        <Select value={reasonCategory} onValueChange={setReasonCategory}>
          <SelectTrigger>
            <SelectValue placeholder="Select a category..." />
          </SelectTrigger>
          <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
            {RESIGNATION_REASONS.map((cat) => (
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
        <p className="text-dense text-muted-foreground text-right">{reason.length} / 2000 (min 50)</p>
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
          <div className="flex items-center gap-2 rounded-lg border border-status-success-rule bg-status-success-surface px-3 py-2 text-xs text-status-success-ink">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            <span className="flex-1 truncate">Letter uploaded successfully</span>
            <button
              type="button"
              onClick={handleRemoveLetterUrl}
              className="text-status-success-ink hover:text-status-success-ink transition-colors duration-200"
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
        <Button
          type="button"
          variant="ghost"
          onClick={handleDownloadTemplate}
          className="h-auto gap-1.5 p-0 text-xs font-normal text-muted-foreground hover:bg-transparent hover:text-foreground"
        >
          <Download className="h-3 w-3" />
          Download Template
        </Button>
      </div>
    </HrSheet>
  );
}
