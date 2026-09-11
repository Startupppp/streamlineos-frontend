"use client";

import { memo, useCallback } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HrSheet } from "@/components/shared/hr-sheet";
import type { InterviewType } from "@/types/hr";

const INTERVIEW_TYPES: InterviewType[] = ["PHONE", "VIDEO", "ONSITE", "TECHNICAL", "HR", "FINAL"];

interface InterviewTypeItemProps {
  type: InterviewType;
}

const InterviewTypeItem = memo(function InterviewTypeItem({ type }: InterviewTypeItemProps) {
  return <SelectItem value={type}>{type}</SelectItem>;
});

interface ScheduleInterviewSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  interviewType: InterviewType;
  scheduledAt: string;
  duration: string;
  meetingLink: string;
  isPending: boolean;
  onInterviewTypeChange: (type: InterviewType) => void;
  onScheduledAtChange: (value: string) => void;
  onDurationChange: (value: string) => void;
  onMeetingLinkChange: (value: string) => void;
  onSubmit: () => void;
}

export const ScheduleInterviewSheet = memo(function ScheduleInterviewSheet({
  open,
  onOpenChange,
  interviewType,
  scheduledAt,
  duration,
  meetingLink,
  isPending,
  onInterviewTypeChange,
  onScheduledAtChange,
  onDurationChange,
  onMeetingLinkChange,
  onSubmit,
}: ScheduleInterviewSheetProps) {
  const handleTypeChange = useCallback(
    (v: string) => onInterviewTypeChange(v as InterviewType),
    [onInterviewTypeChange]
  );
  const handleScheduledAtChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => onScheduledAtChange(e.target.value),
    [onScheduledAtChange]
  );
  const handleDurationChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => onDurationChange(e.target.value),
    [onDurationChange]
  );
  const handleMeetingLinkChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => onMeetingLinkChange(e.target.value),
    [onMeetingLinkChange]
  );

  return (
    <HrSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Schedule Interview"
      onSubmit={onSubmit}
      submitLabel="Schedule"
      isPending={isPending}
    >
      <div className="space-y-1.5">
        <label htmlFor="interview-type" className="text-sm font-medium">Type</label>
        <Select value={interviewType} onValueChange={handleTypeChange}>
          <SelectTrigger id="interview-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
            {INTERVIEW_TYPES.map((t) => (
              <InterviewTypeItem key={t} type={t} />
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="interview-scheduled-at" className="text-sm font-medium">Date &amp; Time</label>
        <Input
          id="interview-scheduled-at"
          type="datetime-local"
          value={scheduledAt}
          onChange={handleScheduledAtChange}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label htmlFor="interview-duration" className="text-sm font-medium">Duration (min)</label>
          <Input id="interview-duration" type="number" value={duration} onChange={handleDurationChange} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="interview-meeting-link" className="text-sm font-medium">Meeting Link</label>
          <Input
            id="interview-meeting-link"
            placeholder="https://..."
            value={meetingLink}
            onChange={handleMeetingLinkChange}
          />
        </div>
      </div>
    </HrSheet>
  );
});

interface JobOption {
  id: number;
  title: string;
  status: string | null;
}

interface JobOptionItemProps {
  job: JobOption;
}

const JobOptionItem = memo(function JobOptionItem({ job }: JobOptionItemProps) {
  return <SelectItem value={String(job.id)}>{job.title}</SelectItem>;
});

interface ApplyToJobSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedJobId: string;
  openJobs?: JobOption[] | null;
  isPending: boolean;
  onJobSelect: (id: string) => void;
  onSubmit: () => void;
}

export const ApplyToJobSheet = memo(function ApplyToJobSheet({
  open,
  onOpenChange,
  selectedJobId,
  openJobs,
  isPending,
  onJobSelect,
  onSubmit,
}: ApplyToJobSheetProps) {
  return (
    <HrSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Apply to Job Posting"
      onSubmit={onSubmit}
      submitLabel="Apply"
      isPending={isPending}
    >
      <div className="space-y-1.5">
        <label htmlFor="apply-job-posting" className="text-sm font-medium">Job Posting</label>
        <Select value={selectedJobId} onValueChange={onJobSelect}>
          <SelectTrigger id="apply-job-posting">
            <SelectValue placeholder="Select a job" />
          </SelectTrigger>
          <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
            {openJobs?.map((j) => (
              <JobOptionItem key={j.id} job={j} />
            ))}
          </SelectContent>
        </Select>
      </div>
    </HrSheet>
  );
});
