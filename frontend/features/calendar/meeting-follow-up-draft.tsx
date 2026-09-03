"use client";

import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import type { ActionItem, FollowUpDraft } from "@/hooks/api/meetings-ai";
import { hasFollowUpContent } from "./meeting-follow-up-stream-parse";

interface DraftedActionItemProps {
  item: ActionItem;
  index: number;
}

function DraftedActionItem({ item, index }: DraftedActionItemProps) {
  return (
    <div className="flex items-start gap-1.5 text-xs">
      <span className="text-muted-foreground shrink-0 tabular-nums mt-0.5">{index + 1}.</span>
      <div className="flex-1 min-w-0">
        <p className="text-foreground">{item.item}</p>
        {(item.assignee ?? item.dueDate) && (
          <p className="text-muted-foreground text-micro mt-0.5">
            {item.assignee && <span>→ {item.assignee}</span>}
            {item.assignee && item.dueDate && <span className="mx-1">·</span>}
            {item.dueDate && <span>{item.dueDate}</span>}
          </p>
        )}
      </div>
    </div>
  );
}

function FollowUpSkeleton() {
  return (
    <div className="space-y-3" role="status" aria-live="polite" aria-busy>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-5/6" />
    </div>
  );
}

interface FollowUpDraftBodyProps {
  draft: FollowUpDraft;
  isStreaming: boolean;
}

/**
 * The structured draft the user sees, rendered from whatever the stream has
 * delivered so far. Every branch is guarded on its own content rather than on
 * completion, so the subject, the email, the action items and the suggested next
 * meeting appear one at a time as the model reaches them instead of all at once
 * at the end. Before the first section arrives the skeleton stands in, so the
 * card is never an empty box.
 */
export function FollowUpDraftBody({ draft, isStreaming }: FollowUpDraftBodyProps) {
  if (!hasFollowUpContent(draft)) return <FollowUpSkeleton />;

  return (
    <div className="space-y-2" aria-busy={isStreaming || undefined}>
      {draft.subject && (
        <p className="text-xs font-medium text-foreground">
          Subject: <span className="font-normal">{draft.subject}</span>
        </p>
      )}

      {draft.body && (
        <>
          <Separator />
          <p className="text-xs text-foreground whitespace-pre-line leading-relaxed">
            {draft.body}
            {isStreaming && (
              <span
                aria-hidden
                className="ml-0.5 inline-block h-3 w-1 translate-y-0.5 bg-foreground motion-safe:animate-pulse"
              />
            )}
          </p>
        </>
      )}

      {draft.actionItems.length > 0 && (
        <>
          <Separator />
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Action items
            </p>
            <div className="space-y-1.5">
              {draft.actionItems.map((item, i) => (
                <DraftedActionItem key={i} item={item} index={i} />
              ))}
            </div>
          </div>
        </>
      )}

      {draft.nextMeetingDate && (
        <>
          <Separator />
          <p className="text-xs text-muted-foreground">
            Next meeting suggested:{" "}
            <span className="font-medium text-foreground">{draft.nextMeetingDate}</span>
          </p>
        </>
      )}
    </div>
  );
}
