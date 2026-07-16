"use client";

import { Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/api-client";
import { useTrainingAttendance, useMarkAttendance, type TrainingAttendance } from "@/hooks/api/hr/training";
import { TruncatedText } from "@/components/ui/truncated-text";

interface Props {
  programId: number;
  canManage: boolean;
}

const STATUS_COLORS: Record<TrainingAttendance["status"], string> = {
  ENROLLED: "bg-blue-50 text-blue-700 border-blue-200/70 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  ATTENDED: "bg-emerald-50 text-emerald-700 border-emerald-200/70 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  ABSENT: "bg-red-50 text-red-700 border-red-200/70 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30",
  CANCELLED: "bg-muted text-muted-foreground border-border dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-700",
};

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3 w-3 ${i < rating ? "fill-amber-400 text-amber-400" : "text-border"}`}
        />
      ))}
    </div>
  );
}

export function AttendancePanel({ programId, canManage }: Props) {
  const { data: attendees, isLoading } = useTrainingAttendance(programId);
  const markAttendance = useMarkAttendance();

  function handleMarkAttended(userId: string) {
    markAttendance.mutate(
      { programId, userId, status: "ATTENDED" },
      {
        onSuccess: () => toast.success("Marked as attended"),
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  function handleMarkAbsent(userId: string) {
    markAttendance.mutate(
      { programId, userId, status: "ABSENT" },
      {
        onSuccess: () => toast.success("Marked as absent"),
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-14 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!attendees?.length) {
    return (
      <EmptyState
        illustrationPreset="person"
        title="No attendees yet"
        description="Enrolled users will appear here"
        className="border-0 bg-transparent shadow-none h-40"
        compact
      />
    );
  }

  return (
    <div className="space-y-2">
      {attendees.map((attendee) => (
        <div
          key={attendee.id}
          className="bg-card rounded-xl border border-border shadow-sm p-3 flex items-center justify-between gap-3"
        >
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-foreground truncate">{attendee.userId}</span>
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[11px] font-medium border ${STATUS_COLORS[attendee.status]}`}>
                {attendee.status}
              </span>
            </div>
            {attendee.feedbackRating !== undefined && attendee.feedbackRating !== null && (
              <StarRating rating={attendee.feedbackRating} />
            )}
            {attendee.feedbackText && (
              <TruncatedText text={attendee.feedbackText} className="text-[11px] text-muted-foreground" />
            )}
          </div>
          {canManage && attendee.status === "ENROLLED" && (
            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                size="sm"
                variant="outline"
                className="text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-500/30 dark:hover:bg-emerald-500/10"
                onClick={() => handleMarkAttended(attendee.userId)}
                disabled={markAttendance.isPending}
              >
                Attended
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs text-red-700 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-500/30 dark:hover:bg-red-500/10"
                onClick={() => handleMarkAbsent(attendee.userId)}
                disabled={markAttendance.isPending}
              >
                Absent
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
