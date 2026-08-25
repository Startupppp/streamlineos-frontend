"use client";

import { useCandidateActivity } from "@/hooks/api/hr/recruitment";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Video,
  MessageSquare,
  FileText,
  Activity as ActivityIcon,
} from "lucide-react";
import { RecruitmentEmptyState } from "@/features/hr/recruitment/components/recruitment-empty-state";
import { TruncatedText } from "@/components/ui/truncated-text";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

const TYPE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  AUDIT: ActivityIcon,
  INTERVIEW: Video,
  MESSAGE: MessageSquare,
  DOCUMENT: FileText,
};

const TYPE_COLOR: Record<string, string> = {
  AUDIT: "bg-muted text-muted-foreground dark:bg-slate-800",
  INTERVIEW:
    "bg-status-info-surface text-status-info-ink",
  MESSAGE: "bg-status-info-surface text-status-info-ink",
  DOCUMENT:
    "bg-status-warning-surface text-status-warning-ink",
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
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-14 w-full rounded-xl" />
        ))}
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
              <div
                className={cn(
                  "h-7 w-7 rounded-full flex items-center justify-center shrink-0",
                  TYPE_COLOR[event.type],
                )}
              >
                <Icon className="h-3.5 w-3.5" />
              </div>
              {idx < events.length - 1 && (
                <div className="w-px flex-1 bg-border my-1" />
              )}
            </div>
            <div className="pb-4 min-w-0 flex-1">
              <TruncatedText
                text={formatLabel(event.label)}
                className="text-sm text-foreground font-medium"
              />
              {event.detail &&
                "from" in event.detail &&
                "to" in event.detail && (
                  <TruncatedText
                    text={`${String(event.detail.from)} → ${String(event.detail.to)}`}
                    className="text-xs text-muted-foreground mt-0.5"
                  />
                )}
              <TruncatedText
                text={`${event.actor ? `${event.actor} · ` : ""}${formatDistanceToNow(new Date(event.at), { addSuffix: true })}`}
                className="text-dense text-muted-foreground mt-1"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
