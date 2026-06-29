"use client";

import { useCallback, useState } from "react";
import { useInterviews, useUpdateInterview } from "@/hooks/api/hr";
import { useBulkRescheduleInterviews } from "@/hooks/api/hr/recruitment";
import { InterviewFeedbackForm } from "@/features/hr/recruitment/interview-feedback-form";
import type { Interview, InterviewResult } from "@/types/hr";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { X, CheckCircle2, XCircle, Clock, CalendarClock, Users, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { EmptyCalendarIllustration } from "@/components/illustrations";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";

const RESULT_CONFIG: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  PASSED: {
    label: "Passed",
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    icon: CheckCircle2,
  },
  FAILED: {
    label: "Failed",
    className: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 border-rose-200 dark:border-rose-800",
    icon: XCircle,
  },
  NO_SHOW: {
    label: "No Show",
    className: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 border-orange-200 dark:border-orange-800",
    icon: XCircle,
  },
  PENDING: {
    label: "Pending",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    icon: Clock,
  },
};

const TYPE_CONFIG: Record<string, { className: string }> = {
  VIDEO: { className: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  PHONE: { className: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300" },
  ONSITE: { className: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300" },
  TECHNICAL: { className: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300" },
  HR: { className: "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300" },
  FINAL: { className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
};

function ResultBadge({ result }: { result: string | null }) {
  const config = RESULT_CONFIG[result ?? "PENDING"] ?? RESULT_CONFIG.PENDING;
  const Icon = config.icon;
  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border",
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
        "inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full",
        config.className
      )}>
        {type ?? "—"}
      </span>
      {panelCount && panelCount > 1 && (
        <span className="inline-flex items-center gap-0.5 text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
          <Users className="h-2.5 w-2.5" />
          {panelCount}
        </span>
      )}
    </div>
  );
}

function CandidateAvatar({ firstName, lastName }: { firstName?: string; lastName?: string }) {
  const initials = `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase();
  return (
    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-[10px] font-bold text-primary border border-primary/20">
      {initials}
    </div>
  );
}

interface InterviewTableRowProps {
  interview: Interview;
  isSelected: boolean;
  onToggleSelect: (id: number) => void;
  onFeedback: (interview: Interview) => void;
}

function InterviewTableRow({ interview, isSelected, onToggleSelect, onFeedback }: InterviewTableRowProps) {
  const handleToggleSelect = useCallback(() => onToggleSelect(interview.id), [onToggleSelect, interview.id]);
  const handleFeedback = useCallback(() => onFeedback(interview), [onFeedback, interview]);
  const panelIds = interview.panelInterviewerIds;

  return (
    <TableRow
      className={cn(
        "transition-colors duration-150",
        isSelected && "bg-primary/5 hover:bg-primary/8"
      )}
    >
      <TableCell className="pl-4">
        <Checkbox
          checked={isSelected}
          onCheckedChange={handleToggleSelect}
          aria-label={`Select interview for ${interview.candidate?.firstName} ${interview.candidate?.lastName}`}
        />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2.5">
          <CandidateAvatar
            firstName={interview.candidate?.firstName}
            lastName={interview.candidate?.lastName}
          />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">
              {interview.candidate?.firstName} {interview.candidate?.lastName}
            </p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <TypeBadge type={interview.type} panelCount={panelIds?.length} />
      </TableCell>
      <TableCell>
        <div className="text-sm">
          <p className="font-medium text-foreground">{format(new Date(interview.scheduledAt), "MMM d, yyyy")}</p>
          <p className="text-[11px] text-muted-foreground">{format(new Date(interview.scheduledAt), "h:mm a")}</p>
        </div>
      </TableCell>
      <TableCell>
        <span className="text-sm text-muted-foreground">{interview.duration} min</span>
      </TableCell>
      <TableCell>
        <ResultBadge result={interview.result} />
      </TableCell>
      <TableCell>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
          onClick={handleFeedback}
        >
          <MessageSquare className="h-3 w-3" />
          Feedback
        </Button>
      </TableCell>
    </TableRow>
  );
}

export function InterviewList() {
  const { data: interviews } = useInterviews();
  const updateInterview = useUpdateInterview();
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

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (!interviews) return;
    setSelectedIds((prev) =>
      prev.size === interviews.length
        ? new Set()
        : new Set(interviews.map((iv) => iv.id)),
    );
  }, [interviews]);

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

  return (
    <>
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
              <span className="text-[10px] font-bold text-primary-foreground">{selectedIds.size}</span>
            </div>
            <span className="text-sm font-semibold text-primary">
              {selectedIds.size} interview{selectedIds.size !== 1 ? "s" : ""} selected
            </span>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <div className="flex items-center gap-1.5">
              <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type="datetime-local"
                className="h-8 text-xs w-52"
                value={bulkNewDate}
                onChange={handleBulkDateChange}
              />
            </div>
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={handleBulkReschedule}
              disabled={bulkReschedule.isPending || !bulkNewDate}
            >
              {bulkReschedule.isPending ? "Rescheduling…" : "Reschedule"}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleClearSelection}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <ScrollArea className="w-full" type="auto">
            <div className="min-w-[820px]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="w-10 pl-4">
                      <Checkbox
                        checked={!!interviews?.length && selectedIds.size === interviews.length}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Select all interviews"
                      />
                    </TableHead>
                    <TableHead className="font-semibold text-foreground/80">Candidate</TableHead>
                    <TableHead className="font-semibold text-foreground/80">Type</TableHead>
                    <TableHead className="font-semibold text-foreground/80">Scheduled</TableHead>
                    <TableHead className="font-semibold text-foreground/80">Duration</TableHead>
                    <TableHead className="font-semibold text-foreground/80">Result</TableHead>
                    <TableHead className="w-[90px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!interviews?.length ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                        <div className="flex flex-col items-center justify-center gap-3 py-4">
                          <EmptyCalendarIllustration className="h-32 w-32 opacity-90" />
                          <div>
                            <p className="text-sm font-medium text-foreground">No interviews scheduled</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Schedule interviews to track candidate progress</p>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    interviews.map((interview) => (
                      <InterviewTableRow
                        key={interview.id}
                        interview={interview}
                        isSelected={selectedIds.has(interview.id)}
                        onToggleSelect={toggleSelect}
                        onFeedback={setFeedbackInterview}
                      />
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
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
