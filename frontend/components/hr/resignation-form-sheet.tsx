"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { format, addDays, differenceInCalendarDays, parseISO, startOfDay } from "date-fns";
import { FileText, Download, CheckCircle2, LogOut, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { HrSheet } from "@/components/shared/hr-sheet";
import { FileUpload } from "@/components/storage/file-upload";
import { useSubmitMyResignation } from "@/hooks/api/hr/exit";
import { getErrorMessage } from "@/lib/get-error-message";
import { RESIGNATION_REASONS, RESIGNATION_REASON_OTHER } from "@/lib/constants/hr-separation";

const DEFAULT_NOTICE_PERIOD_DAYS = 60;
const NOTICE_HINT =
  "Company policy defaults to a 60-day notice period. Pick a different last working date if needed — HR may adjust it when they review.";

function defaultLastWorkingDate(): string {
  return format(addDays(new Date(), DEFAULT_NOTICE_PERIOD_DAYS), "yyyy-MM-dd");
}

interface ResignationFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ResignationFormSheet({ open, onOpenChange }: ResignationFormSheetProps) {
  const submitMyResignation = useSubmitMyResignation();

  const [reason, setReason] = useState("");
  const [reasonCategory, setReasonCategory] = useState("");
  const [otherReasonCategory, setOtherReasonCategory] = useState("");
  const [willingForExitInterview, setWillingForExitInterview] = useState(false);
  const [companyFeedback, setCompanyFeedback] = useState("");
  const [resignationLetterUrl, setResignationLetterUrl] = useState<string | null>(null);
  const [lastWorkingDate, setLastWorkingDate] = useState(defaultLastWorkingDate);
  const [formKey, setFormKey] = useState(0);

  const todayMin = format(new Date(), "yyyy-MM-dd");
  let noticePeriodDays = DEFAULT_NOTICE_PERIOD_DAYS;
  try {
    noticePeriodDays = Math.max(
      0,
      differenceInCalendarDays(parseISO(lastWorkingDate), startOfDay(new Date())),
    );
  } catch {
    noticePeriodDays = DEFAULT_NOTICE_PERIOD_DAYS;
  }

  const resetForm = useCallback(() => {
    setReason("");
    setReasonCategory("");
    setOtherReasonCategory("");
    setWillingForExitInterview(false);
    setCompanyFeedback("");
    setResignationLetterUrl(null);
    setLastWorkingDate(defaultLastWorkingDate());
    setFormKey((k) => k + 1);
  }, []);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) resetForm();
      onOpenChange(next);
    },
    [resetForm, onOpenChange],
  );

  const handleUploadComplete = useCallback((key: string) => {
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

  const handleLastWorkingDateChange = useCallback((value: string) => {
    setLastWorkingDate(value);
  }, []);

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
    if (!lastWorkingDate) {
      toast.error("Please choose a last working date");
      return;
    }
    if (lastWorkingDate < todayMin) {
      toast.error("Last working date cannot be in the past");
      return;
    }
    const resolvedCategory =
      reasonCategory === RESIGNATION_REASON_OTHER
        ? otherReasonCategory.trim()
        : reasonCategory;
    const submission = {
      reason: trimmedReason,
      lastWorkingDate,
      noticePeriodDays,
      reasonCategory: resolvedCategory || undefined,
      willingForExitInterview,
      companyFeedback: companyFeedback.trim() || undefined,
      resignationLetterUrl: resignationLetterUrl ?? undefined,
    };
    const callbacks = {
      onSuccess: () => {
        toast.success("Resignation submitted");
        onOpenChange(false);
        resetForm();
      },
      onError: (e: Error) => toast.error(getErrorMessage(e)),
    };
    submitMyResignation.mutate(submission, callbacks);
  }, [
    reason,
    reasonCategory,
    otherReasonCategory,
    willingForExitInterview,
    companyFeedback,
    lastWorkingDate,
    todayMin,
    noticePeriodDays,
    resignationLetterUrl,
    submitMyResignation,
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
      isPending={submitMyResignation.isPending}
    >
      <div className="space-y-1.5">
        <div className="flex items-center gap-1">
          <label
            htmlFor="resignation-last-working-date"
            className="mb-0 text-sm font-semibold text-foreground"
          >
            Last working date <span className="text-destructive" aria-hidden="true">*</span>
          </label>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="inline-flex size-5 items-center justify-center rounded text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="About notice period"
              >
                <Info className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[16rem] text-xs leading-relaxed">
              {NOTICE_HINT}
            </TooltipContent>
          </Tooltip>
        </div>
        <DatePicker
          id="resignation-last-working-date"
          value={lastWorkingDate}
          fromDate={startOfDay(new Date())}
          onChange={handleLastWorkingDateChange}
          dateFormat="dd MMM yyyy"
          aria-describedby="resignation-notice-hint"
          ariaLabel="Last working date"
        />
        <p id="resignation-notice-hint" className="text-dense text-muted-foreground">
          {noticePeriodDays === 1
            ? "1 day notice from today"
            : `${noticePeriodDays} days notice from today`}
        </p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="resignation-reason-category" className="text-sm font-semibold text-foreground">Reason Category</label>
        <Select value={reasonCategory} onValueChange={setReasonCategory}>
          <SelectTrigger id="resignation-reason-category" aria-label="Reason Category">
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
          <label htmlFor="resignation-other-reason" className="text-sm font-semibold text-foreground">
            Specify Reason <span className="text-destructive" aria-hidden="true">*</span>
          </label>
          <Input
            id="resignation-other-reason"
            placeholder="Briefly describe your reason..."
            value={otherReasonCategory}
            onChange={handleOtherReasonCategoryChange}
            maxLength={100}
            required
          />
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="resignation-explanation" className="text-sm font-semibold text-foreground">
          Detailed Explanation <span className="text-destructive" aria-hidden="true">*</span>
        </label>
        <Textarea
          id="resignation-explanation"
          placeholder="Please describe your reason for leaving..."
          value={reason}
          onChange={handleReasonChange}
          rows={4}
          maxLength={2000}
          className="resize-none w-full"
          required
          aria-describedby="resignation-explanation-hint"
        />
        <p id="resignation-explanation-hint" className="text-dense text-muted-foreground text-right">{reason.length} / 2000 (min 50)</p>
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
        <label htmlFor="resignation-feedback" className="text-sm font-semibold text-foreground">
          Company Feedback{" "}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <Textarea
          id="resignation-feedback"
          placeholder="Any feedback about your experience at the company..."
          value={companyFeedback}
          onChange={handleCompanyFeedbackChange}
          rows={3}
          maxLength={1000}
          className="resize-none w-full"
        />
      </div>

      <div className="space-y-3 rounded-xl border border-border bg-card p-3">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40">
            <FileText className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">
              Resignation letter{" "}
              <span className="font-normal text-muted-foreground">(optional)</span>
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              PDF, Word, or image · max 10 MB. Download the template if you need a draft.
            </p>
          </div>
        </div>

        {resignationLetterUrl ? (
          <div className="flex items-center gap-2 rounded-lg border border-status-success-rule bg-status-success-surface px-3 py-2.5 text-xs text-status-success-ink">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate font-medium">Letter uploaded</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemoveLetterUrl}
              className="h-7 px-2 text-xs text-status-success-ink hover:bg-status-success-surface hover:text-status-success-ink"
            >
              Remove
            </Button>
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

        <div className="flex flex-wrap items-center gap-2 border-t border-border/80 pt-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDownloadTemplate}
            className="h-8 gap-1.5 text-xs"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            Download template
          </Button>
          <span className="text-dense text-muted-foreground">.txt starter draft</span>
        </div>
      </div>
    </HrSheet>
  );
}
