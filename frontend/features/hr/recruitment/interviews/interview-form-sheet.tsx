"use client";

import { useState, useMemo, useCallback } from "react";
import { useScheduleInterview, useCandidates, useJobPostings } from "@/hooks/api/hr";
import { useInterviewerAvailability } from "@/hooks/api/hr/recruitment";
import { InterviewerAvailabilityGrid } from "@/components/hr/recruitment/interviewer-availability-grid";
import { useCalendarOrgMembers } from "@/hooks/api/calendar";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetBody,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import { Plus, User, Briefcase, Calendar, Clock, Video } from "lucide-react";
import { getErrorMessage } from "@/lib/get-error-message";
import { FieldGroup } from "./field-group";
import { CandidateSelect } from "./candidate-select";
import { InterviewerSelect } from "./interviewer-select";
import { InterviewNotificationsSection } from "./interview-notifications-section";

const INTERVIEW_FORMATS = [
  { value: "VIDEO", label: "Video Call" },
  { value: "PHONE", label: "Phone Call" },
  { value: "IN_PERSON", label: "In-Person / Onsite" },
] as const;

type InterviewFormat = (typeof INTERVIEW_FORMATS)[number]["value"];

interface InterviewFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InterviewFormSheet({
  open,
  onOpenChange,
}: InterviewFormSheetProps) {
  const { data: allCandidates } = useCandidates();
  const { data: jobPostings } = useJobPostings({ status: "OPEN" });
  const { data: orgMembers } = useCalendarOrgMembers();
  const scheduleInterview = useScheduleInterview();

  const [candidatePickerOpen, setCandidatePickerOpen] = useState(false);
  const [interviewerPickerOpen, setInterviewerPickerOpen] = useState(false);
  const [candidateId, setCandidateId] = useState("");
  const [jobPostingId, setJobPostingId] = useState("");
  const [format_, setFormat_] = useState<InterviewFormat>("VIDEO");
  const [scheduledAt, setScheduledAt] = useState("");
  const [duration, setDuration] = useState("60");
  const [meetLink, setMeetLink] = useState("");
  const [interviewerIds, setInterviewerIds] = useState<string[]>([]);
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyWhatsApp, setNotifyWhatsApp] = useState(false);

  const selectedInterviewers = useMemo(
    () => orgMembers?.filter((m) => interviewerIds.includes(m.id)) ?? [],
    [orgMembers, interviewerIds],
  );

  const availabilityDate = useMemo(() => {
    if (!scheduledAt) return null;
    const d = new Date(scheduledAt);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
  }, [scheduledAt]);

  const { data: availabilityData } = useInterviewerAvailability(
    interviewerIds,
    availabilityDate,
  );

  const interviewerNamesMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const iv of selectedInterviewers) {
      m.set(iv.id, iv.name ?? iv.email ?? "—");
    }
    return m;
  }, [selectedInterviewers]);

  const toggleInterviewer = useCallback((userId: string) => {
    setInterviewerIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  }, []);

  const resetForm = useCallback(() => {
    setCandidateId("");
    setJobPostingId("");
    setScheduledAt("");
    setMeetLink("");
    setInterviewerIds([]);
    setNotifyEmail(true);
    setNotifyWhatsApp(false);
    setDuration("60");
    setFormat_("VIDEO");
  }, []);

  const handleCreate = useCallback(() => {
    if (!candidateId || !scheduledAt) {
      toast.error("Candidate and scheduled date are required");
      return;
    }
    const scheduledDate = new Date(scheduledAt);
    if (scheduledDate <= new Date()) {
      toast.error("Interview date must be in the future");
      return;
    }
    if (interviewerIds.length === 0) {
      toast.error("At least one interviewer is required");
      return;
    }
    const numDuration = Number(duration);
    if (
      !Number.isInteger(numDuration) ||
      numDuration < 15 ||
      numDuration > 480
    ) {
      toast.error("Duration must be a whole number between 15 and 480 minutes");
      return;
    }
    if (format_ === "VIDEO" && !meetLink.trim()) {
      toast.error("Meet link is required for video interviews");
      return;
    }
    scheduleInterview.mutate(
      {
        candidateId: Number(candidateId),
        jobPostingId: jobPostingId ? Number(jobPostingId) : undefined,
        format: format_,
        scheduledAt: scheduledDate.toISOString(),
        durationMinutes: numDuration,
        meetLink: meetLink.trim() || undefined,
        interviewers: interviewerIds,
        notifyChannels: { email: notifyEmail, whatsapp: notifyWhatsApp },
      },
      {
        onSuccess: () => {
          toast.success("Interview scheduled");
          onOpenChange(false);
          resetForm();
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [
    candidateId,
    jobPostingId,
    format_,
    scheduledAt,
    duration,
    meetLink,
    interviewerIds,
    notifyEmail,
    notifyWhatsApp,
    scheduleInterview,
    resetForm,
    onOpenChange,
  ]);

  function handleFormatChange(v: string) {
    setFormat_(v as InterviewFormat);
  }

  function handleScheduledAtChange(e: React.ChangeEvent<HTMLInputElement>) {
    setScheduledAt(e.target.value);
  }

  function handleDurationChange(e: React.ChangeEvent<HTMLInputElement>) {
    setDuration(e.target.value);
  }

  function handleMeetLinkChange(e: React.ChangeEvent<HTMLInputElement>) {
    setMeetLink(e.target.value);
  }

  function handleCancelSheet() {
    onOpenChange(false);
    resetForm();
  }

  function handleSelectCandidate(idStr: string) {
    setCandidateId(idStr);
    setCandidatePickerOpen(false);
  }

  function handleSheetOpenChange(v: boolean) {
    onOpenChange(v);
    if (!v) resetForm();
  }

  return (
    <Sheet open={open} onOpenChange={handleSheetOpenChange}>
      <SheetTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Schedule Interview
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col p-0 gap-0">
        <SheetHeader className="shrink-0 px-6 py-4 border-b border-border/60 gap-1">
          <SheetTitle className="text-base font-semibold">
            Schedule Interview
          </SheetTitle>
          <SheetDescription className="text-sm text-muted-foreground">
            Set up an interview session. Notifications will be sent
            automatically.
          </SheetDescription>
        </SheetHeader>

        <SheetBody className="space-y-5 px-6 py-5">
          <FieldGroup
            icon={User}
            label="Candidate"
            colorClass="bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"
          >
            <CandidateSelect
              candidates={allCandidates}
              candidateId={candidateId}
              open={candidatePickerOpen}
              onOpenChange={setCandidatePickerOpen}
              onSelect={handleSelectCandidate}
            />
          </FieldGroup>

          <div className="border-t border-border/60" />

          <FieldGroup
            icon={Briefcase}
            label="Job Position"
            colorClass="bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"
          >
            <Select value={jobPostingId} onValueChange={setJobPostingId}>
              <SelectTrigger className="">
                <SelectValue placeholder="Select position..." />
              </SelectTrigger>
              <SelectContent className="min-w-[var(--radix-select-trigger-width)] max-h-[200px] overflow-y-auto">
                {jobPostings?.map((jp: { id: number; title: string }) => (
                  <SelectItem key={jp.id} value={String(jp.id)}>
                    {jp.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldGroup>

          <div className="border-t border-border/60" />

          <FieldGroup
            icon={Calendar}
            label="Schedule"
            colorClass="bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
          >
            <div className="space-y-2.5">
              <Input
                type="datetime-local"
                value={scheduledAt}
                min={new Date().toISOString().slice(0, 16)}
                onChange={handleScheduledAtChange}
                className=""
              />
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-dense font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="h-3 w-3" />
                    Format
                  </label>
                  <Select value={format_} onValueChange={handleFormatChange}>
                    <SelectTrigger className="">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
                      {INTERVIEW_FORMATS.map((f) => (
                        <SelectItem key={f.value} value={f.value}>
                          {f.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-dense font-semibold text-muted-foreground uppercase tracking-wider">
                    Duration (min)
                  </label>
                  <Input
                    type="number"
                    min={15}
                    max={480}
                    step={15}
                    value={duration}
                    onChange={handleDurationChange}
                    className=""
                  />
                </div>
              </div>
              {format_ === "VIDEO" && (
                <div className="space-y-1.5">
                  <label className="text-dense font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Video className="h-3 w-3" />
                    Meet Link <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="url"
                    placeholder="https://meet.google.com/..."
                    value={meetLink}
                    onChange={handleMeetLinkChange}
                    className=""
                  />
                </div>
              )}
            </div>
          </FieldGroup>

          {availabilityData && availabilityData.availability.length > 0 && (
            <InterviewerAvailabilityGrid
              availability={availabilityData.availability}
              interviewerNames={interviewerNamesMap}
              selectedTime={scheduledAt || null}
              durationMinutes={Number(duration) || 60}
            />
          )}

          <div className="border-t border-border/60" />

          <FieldGroup
            icon={User}
            label="Interviewers"
            colorClass="bg-muted text-muted-foreground dark:bg-slate-800/60 dark:text-slate-400"
          >
            <InterviewerSelect
              orgMembers={orgMembers}
              selectedInterviewers={selectedInterviewers}
              interviewerIds={interviewerIds}
              open={interviewerPickerOpen}
              onOpenChange={setInterviewerPickerOpen}
              onToggle={toggleInterviewer}
            />
          </FieldGroup>

          <div className="border-t border-border/60" />

          <InterviewNotificationsSection
            notifyEmail={notifyEmail}
            notifyWhatsApp={notifyWhatsApp}
            onEmailChange={setNotifyEmail}
            onWhatsAppChange={setNotifyWhatsApp}
          />
        </SheetBody>

        <SheetFooter className="shrink-0 flex-row gap-2 border-t border-border bg-muted/30 px-6 py-4">
          <Button
            variant="outline"
            className="flex-1 h-9"
            onClick={handleCancelSheet}
          >
            Cancel
          </Button>
          <LoadingButton
            className="flex-1 h-9"
            onClick={handleCreate}
            isPending={scheduleInterview.isPending}
            loadingText="Scheduling..."
          >
            Schedule Interview
          </LoadingButton>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
