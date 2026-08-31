"use client";

import { useMemo } from "react";
import Link from "next/link";
import { UserSearch, AlertTriangle } from "lucide-react";
import { format, isToday, isPast } from "date-fns";
import { WidgetCard } from "@/components/ui/widget-card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyPersonIllustration } from "@/components/illustrations";
import { TruncatedText } from "@/components/ui/truncated-text";
import { useInterviews } from "@/hooks/api/hr";
import { useDashboardAccess } from "@/features/dashboard/use-dashboard-access";
import type { Interview } from "@/types/hr";

const WIDGET_PAGE_SIZE = 6;

interface InterviewTask {
  id: number;
  candidateId: number;
  candidateName: string;
  scheduledAt: Date;
  type: string;
  needsFeedback: boolean;
}

function toInterviewTask(interview: Interview): InterviewTask | null {
  const scheduledAt = new Date(interview.scheduledAt);
  if (Number.isNaN(scheduledAt.getTime())) return null;
  const candidate = interview.candidate;
  const candidateName =
    [candidate?.firstName, candidate?.lastName].filter(Boolean).join(" ").trim() ||
    candidate?.email ||
    "Candidate";
  return {
    id: interview.id,
    candidateId: interview.candidateId,
    candidateName,
    scheduledAt,
    type: interview.type ?? "INTERVIEW",
    needsFeedback:
      interview.result === "PENDING" && isPast(scheduledAt) && !isToday(scheduledAt),
  };
}

function InterviewRow({ task }: { task: InterviewTask }) {
  return (
    <li>
      <Link
        href={`/hr/recruitment/candidates/${task.candidateId}`}
        className="flex items-center gap-2.5 rounded-lg border border-border/60 px-2.5 py-2 hover:bg-muted/50 transition-colors"
      >
        <Avatar className="w-7">
          <AvatarFallback className="text-micro bg-primary/10 text-primary">
            {task.candidateName[0]}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <TruncatedText text={task.candidateName} className="text-xs font-medium" />
          <p className="text-micro text-muted-foreground capitalize">
            {format(task.scheduledAt, isToday(task.scheduledAt) ? "h:mm a" : "MMM d, h:mm a")}
            {" · "}
            {task.type.replace(/_/g, " ").toLowerCase()}
          </p>
        </div>
        {task.needsFeedback ? (
          <Badge
            variant="outline"
            className="h-4 shrink-0 px-1.5 py-0 text-micro border-status-warning-rule bg-status-warning-surface text-status-warning-ink"
          >
            <AlertTriangle className="mr-0.5 h-2.5 w-2.5" aria-hidden="true" />
            Feedback
          </Badge>
        ) : (
          <Badge variant="outline" className="h-4 shrink-0 px-1.5 py-0 text-micro">
            Today
          </Badge>
        )}
      </Link>
    </li>
  );
}

export function RecruitmentWidget() {
  const { hrEnabled, canViewInterviews } = useDashboardAccess();
  const enabled = hrEnabled && canViewInterviews;

  const { data, isLoading, error, refetch } = useInterviews(
    { relevant: true, pageSize: WIDGET_PAGE_SIZE },
    { enabled },
  );

  const tasks = useMemo(() => {
    const mapped = (data ?? [])
      .map(toInterviewTask)
      .filter((task): task is InterviewTask => task !== null);
    return mapped.sort((a, b) => {
      if (a.needsFeedback !== b.needsFeedback) return a.needsFeedback ? -1 : 1;
      return a.scheduledAt.getTime() - b.scheduledAt.getTime();
    });
  }, [data]);

  if (!enabled) return null;

  const pendingFeedbackCount = tasks.filter((task) => task.needsFeedback).length;

  return (
    <WidgetCard
      icon={UserSearch}
      iconClassName="text-primary"
      title="Recruitment"
      badge={tasks.length || undefined}
      link={{ href: "/hr/recruitment/interviews", label: "View" }}
      isLoading={isLoading}
      error={error}
      onRetry={() => void refetch()}
      loadingRows={3}
      isEmpty={!tasks.length}
      empty={
        <EmptyState
          illustration={<EmptyPersonIllustration className="h-20 w-20" />}
          title="No interview tasks"
          description="Interviews scheduled today and pending scorecards appear here."
          compact
        />
      }
    >
      <div className="space-y-2.5">
        {pendingFeedbackCount > 0 && (
          <div className="flex items-center justify-between rounded-lg border border-border/60 px-2.5 py-2">
            <span className="text-dense text-muted-foreground">
              Scorecards awaiting feedback
            </span>
            <span className="text-sm font-semibold tabular-nums">
              {pendingFeedbackCount}
            </span>
          </div>
        )}
        <ul className="space-y-2 overflow-y-auto max-h-56">
          {tasks.map((task) => (
            <InterviewRow key={task.id} task={task} />
          ))}
        </ul>
      </div>
    </WidgetCard>
  );
}
