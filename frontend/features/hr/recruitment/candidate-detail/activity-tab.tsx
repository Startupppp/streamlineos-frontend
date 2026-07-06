"use client";

import { useCandidateActivity } from "@/hooks/api/hr/recruitment";
import { Skeleton } from "@/components/ui/skeleton";
import { RecruitmentEmptyState } from "@/features/hr/recruitment/components/recruitment-empty-state";
import { History, Video, MessageSquare, FileText, Activity as ActivityIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

const TYPE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  AUDIT: ActivityIcon,
  INTERVIEW: Video,
  MESSAGE: MessageSquare,
  DOCUMENT: FileText,
};

const TYPE_COLOR: Record<string, string> = {
  AUDIT: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  INTERVIEW: "bg-violet-100 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300",
  MESSAGE: "bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300",
  DOCUMENT: "bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300",
};

function formatLabel(label: string): string {
  if (label === "CANDIDATE_STAGE_CHANGED") return "Stage changed";
  return label;
}

interface Props {
  candidateId: number;
}

export function ActivityTab({ candidateId }: Props) {
  const { data: events, isLoading } = useCandidateActivity(candidateId);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
      </div>
    );
  }

  if (!events?.length) {
    return (
      <RecruitmentEmptyState
        illustrationPreset="activity"
        title="No activity yet"
        description="Stage changes, interviews, messages, and documents will show up here."
        compact
      />
    );
  }

  return (
    <div className="space-y-0">
      {events.map((event, idx) => {
        const Icon = TYPE_ICON[event.type] ?? ActivityIcon;
        return (
          <div key={event.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={cn("h-7 w-7 rounded-full flex items-center justify-center shrink-0", TYPE_COLOR[event.type])}>
                <Icon className="h-3.5 w-3.5" />
              </div>
              {idx < events.length - 1 && <div className="w-px flex-1 bg-border my-1" />}
            </div>
            <div className="pb-4 min-w-0 flex-1">
              <p className="text-sm text-foreground font-medium">{formatLabel(event.label)}</p>
              {event.detail && "from" in event.detail && "to" in event.detail && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {String(event.detail.from)} → {String(event.detail.to)}
                </p>
              )}
              <p className="text-[11px] text-muted-foreground mt-1">
                {event.actor ? `${event.actor} · ` : ""}
                {formatDistanceToNow(new Date(event.at), { addSuffix: true })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
