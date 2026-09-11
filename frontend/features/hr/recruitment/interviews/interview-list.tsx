"use client";

import { useCallback, useMemo, useState } from "react";
import { useInterviews } from "@/hooks/api/hr";
import { useBulkRescheduleInterviews } from "@/hooks/api/hr/recruitment";
import { InterviewFeedbackForm } from "@/features/hr/recruitment/interview-feedback-form";
import type { Interview } from "@/types/hr";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Clock, CalendarClock, Users, MessageSquare } from "lucide-react";
import { XIcon } from "@animateicons/react/lucide";
import { TooltipIconButton } from "@/components/ui/tooltip-icon-button";
import { format } from "date-fns";
import { EmptyCalendarIllustration } from "@/components/illustrations";
import { RecruitmentEmptyState } from "@/features/hr/recruitment/components/recruitment-empty-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import { TruncatedText } from "@/components/ui/truncated-text";

const RESULT_CONFIG: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  PASSED: {
    label: "Passed",
    className: "bg-status-success-surface text-status-success-ink border-status-success-rule",
    icon: CheckCircle2,
  },
  FAILED: {
    label: "Failed",
    className: "bg-status-danger-surface text-status-danger-ink border-status-danger-rule",
    icon: XCircle,
  },
  NO_SHOW: {
    label: "No Show",
    // A no-show is an outcome, not a state still in flight; it read as amber
    // beside PENDING and the two were indistinguishable.
    className: "bg-category-orange-surface text-category-orange-ink border-category-orange-rule",
    icon: XCircle,
  },
  PENDING: {
    label: "Pending",
    className: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
    icon: Clock,
  },
};

/**
 * Interview format is a taxonomy — a phone screen is not more "informational"
 * than an onsite. Three of the six read "info" and were one chip.
 *
 * PHONE and TECHNICAL take sky and indigo rather than the blue all three
 * shared before the migration; VIDEO keeps it.
 */
const TYPE_CONFIG: Record<string, { className: string }> = {
  VIDEO: { className: "bg-category-blue-surface text-category-blue-ink" },
  PHONE: { className: "bg-category-sky-surface text-category-sky-ink" },
  ONSITE: { className: "bg-category-teal-surface text-category-teal-ink" },
  TECHNICAL: { className: "bg-category-indigo-surface text-category-indigo-ink" },
  HR: { className: "bg-category-pink-surface text-category-pink-ink" },
  FINAL: { className: "bg-muted text-muted-foreground" },
};

function ResultBadge({ result }: { result: string | null }) {
  const config = RESULT_CONFIG[result ?? "PENDING"] ?? RESULT_CONFIG.PENDING;
  const Icon = config.icon;
  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-micro font-semibold px-2 py-0.5 rounded-full border",
      config.className
    )}>
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}

function TypeBadge({ type, panelCount }: { type: string | null; panelCount?: number }) {
  const config = TYPE_CONFIG[type ?? ""] ?? { className: "bg-muted text-muted-foreground" };
  return (
    <div className="flex items-center gap-1">
      <span className={cn(
        "inline-flex items-center text-micro font-semibold px-2 py-0.5 rounded-full",
        config.className
      )}>
        {type ?? "—"}
      </span>
      {panelCount && panelCount > 1 && (
        <span className="inline-flex items-center gap-0.5 text-micro font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
          <Users className="h-2.5 w-2.5" />
          {panelCount}
        </span>
      )}
    </div>
  );
}

function FeedbackButton({ interview, onFeedback }: { interview: Interview; onFeedback: (i: Interview) => void }) {
  function handleClick() {
    onFeedback(interview);
  }
  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-xs gap-1.5 text-muted-foreground hover:text-foreground"
      onClick={handleClick}
    >
      <MessageSquare className="h-3 w-3" />
      Feedback
    </Button>
  );
}

function CandidateAvatar({ firstName, lastName }: { firstName?: string; lastName?: string }) {
  const initials = `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase();
  return (
    <div className="w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-micro font-bold text-primary border border-primary/20">
      {initials}
    </div>
  );
}

export function InterviewList() {
  const { data: interviews } = useInterviews({ limit: 100 });
  const bulkReschedule = useBulkRescheduleInterviews();

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkNewDate, setBulkNewDate] = useState("");
  const [feedbackInterview, setFeedbackInterview] = useState<Interview | null>(null);

  const handleBulkReschedule = useCallback(() => {
    if (!bulkNewDate) {
      toast.error("Select a new date first");
      return;
    }
    if (selectedIds.size === 0) return;
    bulkReschedule.mutate(
      {
        ids: Array.from(selectedIds),
        scheduledAt: new Date(bulkNewDate).toISOString(),
      },
      {
        onSuccess: (data) => {
          toast.success(`${data.rescheduled} interview${data.rescheduled !== 1 ? "s" : ""} rescheduled`);
          setSelectedIds(new Set());
          setBulkNewDate("");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [bulkNewDate, selectedIds, bulkReschedule]);

  function handleBulkDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    setBulkNewDate(e.target.value);
  }

  function handleClearSelection() {
    setSelectedIds(new Set());
    setBulkNewDate("");
  }

  function handleFeedbackClose(open: boolean) {
    if (!open) setFeedbackInterview(null);
  }

  function handleSelectionChange(sel: Set<string | number>) {
    setSelectedIds(new Set([...sel].map(Number)));
  }

  const columns = useMemo<DataTableColumn<Interview>[]>(() => [
    {
      key: "candidate",
      header: "Candidate",
      cell: (interview) => (
        <div className="flex items-center gap-2.5">
          <CandidateAvatar
            firstName={interview.candidate?.firstName}
            lastName={interview.candidate?.lastName}
          />
          <div className="min-w-0">
            <TruncatedText text={`${interview.candidate?.firstName ?? ""} ${interview.candidate?.lastName ?? ""}`.trim()} className="text-sm font-semibold text-foreground" />
          </div>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      cell: (interview) => (
        <TypeBadge
          type={interview.type}
          panelCount={interview.panelInterviewerIds?.length}
        />
      ),
    },
    {
      key: "scheduledAt",
      header: "Scheduled",
      cell: (interview) => (
        <div className="text-sm">
          <p className="font-medium text-foreground">{format(new Date(interview.scheduledAt), "MMM d, yyyy")}</p>
          <p className="text-dense text-muted-foreground">{format(new Date(interview.scheduledAt), "h:mm a")}</p>
        </div>
      ),
    },
    {
      key: "duration",
      header: "Duration",
      cell: (interview) => (
        <span className="text-sm text-muted-foreground">{interview.duration} min</span>
      ),
    },
    {
      key: "result",
      header: "Result",
      cell: (interview) => <ResultBadge result={interview.result} />,
    },
    {
      key: "feedback",
      header: "",
      className: "w-[90px]",
      cell: (interview) => (
        <FeedbackButton interview={interview} onFeedback={setFeedbackInterview} />
      ),
    },
  ], []);

  function getRowKey(interview: Interview) {
    return interview.id;
  }

  return (
    <>
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
              <span className="text-micro font-bold text-primary-foreground">{selectedIds.size}</span>
            </div>
            <span className="text-sm font-semibold text-foreground">
              {selectedIds.size} interview{selectedIds.size !== 1 ? "s" : ""} selected
            </span>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <div className="flex items-center gap-1.5">
              <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type="datetime-local"
                className="text-xs w-52"
                value={bulkNewDate}
                onChange={handleBulkDateChange}
              />
            </div>
            <LoadingButton
              size="sm"
              className="text-xs gap-1.5"
              onClick={handleBulkReschedule}
              disabled={!bulkNewDate}
              isPending={bulkReschedule.isPending}
              loadingText="Rescheduling…"
            >
              Reschedule
            </LoadingButton>
            <TooltipIconButton icon={XIcon} iconSize={14} variant="ghost" label="Clear selection" className="w-8" onClick={handleClearSelection} />
          </div>
        </div>
      )}

      <Card className="flex flex-1 min-h-0 flex-col overflow-hidden">
        <CardContent className="flex flex-1 min-h-0 p-0">
          <DataTable
            data={interviews ?? []}
            columns={columns}
            getRowKey={getRowKey}
            selection={{
              selected: selectedIds,
              onChange: handleSelectionChange,
              getRowLabel: (interview) =>
                `${interview.candidate?.firstName ?? ""} ${interview.candidate?.lastName ?? ""}`.trim(),
            }}
            minWidth="820px"
            className="flex-1 min-h-0"
            emptyState={
              <RecruitmentEmptyState
                illustration={<EmptyCalendarIllustration />}
                title="No interviews scheduled"
                description="Schedule interviews to track candidate progress"
                compact
                className="border-0 bg-transparent shadow-none"
              />
            }
          />
        </CardContent>
      </Card>

      {feedbackInterview && (
        <InterviewFeedbackForm
          interview={feedbackInterview}
          open={feedbackInterview !== null}
          onOpenChange={handleFeedbackClose}
        />
      )}
    </>
  );
}
