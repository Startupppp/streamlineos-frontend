"use client";

import { useState, useMemo, useCallback } from "react";
import { useScheduleInterview, useCandidates, useJobPostings } from "@/hooks/api/hr";
import { useInterviewerAvailability } from "@/hooks/api/hr/recruitment";
import { InterviewerAvailabilityGrid } from "@/components/hr/recruitment/interviewer-availability-grid";
import { useCalendarOrgMembers } from "@/hooks/api/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import {
  Check,
  ChevronsUpDown,
  Plus,
  X,
  User,
  Briefcase,
  Calendar,
  Clock,
  Video,
  Bell,
} from "lucide-react";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";

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

interface FieldGroupProps {
  icon: React.ElementType;
  label: string;
  colorClass: string;
  children: React.ReactNode;
}

function FieldGroup({
  icon: Icon,
  label,
  colorClass,
  children,
}: FieldGroupProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "h-7 w-7 rounded-lg flex items-center justify-center shrink-0",
            colorClass,
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </div>
        <span className="text-sm font-semibold text-foreground">{label}</span>
      </div>
      {children}
    </div>
  );
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

  const selectedCandidate = useMemo(
    () => allCandidates?.find((c) => String(c.id) === candidateId),
    [allCandidates, candidateId],
  );

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

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) resetForm();
      }}
    >
      <SheetTrigger asChild>
        <Button size="sm" className="gap-1.5 h-8">
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

        <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-5 space-y-5">
          <FieldGroup
            icon={User}
            label="Candidate"
            colorClass="bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"
          >
            <Popover
              open={candidatePickerOpen}
              onOpenChange={setCandidatePickerOpen}
            >
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={candidatePickerOpen}
                  className="w-full justify-between font-normal h-9"
                >
                  <span className="truncate text-sm">
                    {selectedCandidate
                      ? `${selectedCandidate.firstName} ${selectedCandidate.lastName}`
                      : "Select candidate"}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[var(--radix-popover-trigger-width)] p-0"
                align="start"
              >
                <Command>
                  <CommandInput placeholder="Search candidates..." />
                  <CommandList>
                    <CommandEmpty>No candidate found.</CommandEmpty>
                    <CommandGroup>
                      {allCandidates?.map((c) => {
                        const label = `${c.firstName} ${c.lastName}`.trim();
                        const idStr = String(c.id);
                        return (
                          <CommandItem
                            key={c.id}
                            value={`${label} ${c.email ?? ""}`}
                            onSelect={() => handleSelectCandidate(idStr)}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                candidateId === idStr
                                  ? "opacity-100"
                                  : "opacity-0",
                              )}
                            />
                            <span className="truncate">{label}</span>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </FieldGroup>

          <div className="border-t border-border/60" />

          <FieldGroup
            icon={Briefcase}
            label="Job Position"
            colorClass="bg-violet-100 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400"
          >
            <Select value={jobPostingId} onValueChange={setJobPostingId}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select position..." />
              </SelectTrigger>
              <SelectContent className="w-[var(--radix-select-trigger-width)] max-h-[200px] overflow-y-auto">
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
                className="h-9"
              />
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="h-3 w-3" />
                    Format
                  </label>
                  <Select value={format_} onValueChange={handleFormatChange}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="w-[var(--radix-select-trigger-width)]">
                      {INTERVIEW_FORMATS.map((f) => (
                        <SelectItem key={f.value} value={f.value}>
                          {f.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Duration (min)
                  </label>
                  <Input
                    type="number"
                    min={15}
                    max={480}
                    step={15}
                    value={duration}
                    onChange={handleDurationChange}
                    className="h-9"
                  />
                </div>
              </div>
              {format_ === "VIDEO" && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Video className="h-3 w-3" />
                    Meet Link <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="url"
                    placeholder="https://meet.google.com/..."
                    value={meetLink}
                    onChange={handleMeetLinkChange}
                    className="h-9"
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
            <div className="space-y-2">
              {selectedInterviewers.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedInterviewers.map((m) => (
                    <span
                      key={m.id}
                      className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-primary/10 text-foreground border-primary/20"
                    >
                      {m.name ?? m.email}
                      <button
                        type="button"
                        onClick={() => toggleInterviewer(m.id)}
                        className="hover:text-destructive transition-colors duration-200 ml-0.5 rounded"
                        aria-label={`Remove ${m.name ?? m.email}`}
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <Popover
                open={interviewerPickerOpen}
                onOpenChange={setInterviewerPickerOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start font-normal text-muted-foreground gap-1.5 h-9"
                    size="sm"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add interviewer
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[var(--radix-popover-trigger-width)] p-0"
                  align="start"
                >
                  <Command>
                    <CommandInput placeholder="Search members..." />
                    <CommandList>
                      <CommandEmpty>No members found.</CommandEmpty>
                      <CommandGroup>
                        {orgMembers?.map((m) => {
                          const label = m.name ?? m.email;
                          const selected = interviewerIds.includes(m.id);
                          return (
                            <CommandItem
                              key={m.id}
                              value={`${label} ${m.email}`}
                              onSelect={() => toggleInterviewer(m.id)}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selected ? "opacity-100" : "opacity-0",
                                )}
                              />
                              <div className="flex flex-col">
                                <span className="text-sm">{label}</span>
                                <span className="text-xs text-muted-foreground">
                                  {m.role}
                                </span>
                              </div>
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </FieldGroup>

          <div className="border-t border-border/60" />

          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-7 w-7 rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Bell className="h-3.5 w-3.5" />
              </div>
              <span className="text-sm font-semibold text-foreground">
                Notifications
              </span>
            </div>
            <div className="rounded-2xl border border-border bg-muted/30 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
                <div>
                  <p className="text-sm font-medium text-foreground">Email</p>
                  <p className="text-[11px] text-muted-foreground">
                    Notify via email
                  </p>
                </div>
                <Switch
                  checked={notifyEmail}
                  onCheckedChange={setNotifyEmail}
                  aria-label="Send email notifications"
                />
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    WhatsApp
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Requires Twilio configuration
                  </p>
                </div>
                <Switch
                  checked={notifyWhatsApp}
                  onCheckedChange={setNotifyWhatsApp}
                  aria-label="Send WhatsApp notifications"
                />
              </div>
            </div>
          </div>
        </div>

        <SheetFooter className="shrink-0 px-6 py-4 border-t border-border/60 bg-muted/30 flex-row gap-2">
          <Button
            variant="outline"
            className="flex-1 h-9"
            onClick={handleCancelSheet}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 h-9"
            onClick={handleCreate}
            disabled={scheduleInterview.isPending}
          >
            {scheduleInterview.isPending
              ? "Scheduling..."
              : "Schedule Interview"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
