"use client";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  EmptyTasksIllustration,
  EmptyActivityIllustration,
} from "@/components/illustrations";
import { ListChecks, Link2, History } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  PmPanel,
  PmSection,
} from "@/components/pm-chrome";
import { TEXT_BODY } from "@/lib/text-overflow";
import { cn } from "@/lib/utils";
import type { KeyResult, GoalDetail } from "@/hooks/api/goals";
import { KeyResultRow } from "@/features/build/goals/key-result-row";
import { LinkRow } from "@/features/build/goals/link-row";
import { AddLinkButton } from "@/features/build/goals/goal-detail-actions";

interface GoalKeyResultsSectionProps {
  keyResults: GoalDetail["keyResults"];
  onCheckIn: (kr: KeyResult) => void;
  canManage: boolean;
}

export function GoalKeyResultsSection({
  keyResults,
  onCheckIn,
  canManage,
}: GoalKeyResultsSectionProps) {
  return (
    <PmSection index={1} className="space-y-3">
      <div className="flex items-center gap-2">
        <ListChecks className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-medium">Key Results</h2>
        <Badge variant="secondary" className="text-micro">
          {keyResults.length}
        </Badge>
      </div>
      {keyResults.length === 0 ? (
        <PmPanel className="flex items-center justify-center p-4">
          <EmptyState
            illustration={<EmptyTasksIllustration />}
            compact
            title="No key results"
            description="Edit this goal to add measurable key results."
          />
        </PmPanel>
      ) : (
        <div className="space-y-2">
          {keyResults.map((kr) => (
            <KeyResultRow
              key={kr.id}
              keyResult={kr}
              onCheckIn={onCheckIn}
              canManage={canManage}
            />
          ))}
        </div>
      )}
    </PmSection>
  );
}

interface GoalLinkedItemsSectionProps {
  links: GoalDetail["links"];
  canManage: boolean;
  onOpenAddLink: () => void;
  onRemoveLink: (linkId: number) => void;
}

export function GoalLinkedItemsSection({
  links,
  canManage,
  onOpenAddLink,
  onRemoveLink,
}: GoalLinkedItemsSectionProps) {
  return (
    <PmSection index={2} className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Link2 className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-medium">Linked Work Items</h2>
          <Badge variant="secondary" className="text-micro">
            {links.length}
          </Badge>
        </div>
        {canManage ? <AddLinkButton onClick={onOpenAddLink} /> : null}
      </div>
      {links.length === 0 ? (
        <PmPanel className="flex items-center justify-center p-4">
          <EmptyState
            illustration={<EmptyActivityIllustration />}
            compact
            title="No linked work"
            description="Connect projects or tickets that contribute to this goal."
          />
        </PmPanel>
      ) : (
        <PmPanel>
          {links.map((link) => (
            <LinkRow
              key={link.id}
              link={link}
              onRemove={onRemoveLink}
              canManage={canManage}
            />
          ))}
        </PmPanel>
      )}
    </PmSection>
  );
}

interface GoalUpdatesTimelineProps {
  updates: GoalDetail["updates"];
}

export function GoalUpdatesTimeline({ updates }: GoalUpdatesTimelineProps) {
  return (
    <PmSection index={3} className="space-y-3">
      <div className="flex items-center gap-2">
        <History className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-medium">Updates Timeline</h2>
      </div>
      {updates.length === 0 ? (
        <PmPanel className="flex items-center justify-center p-4">
          <EmptyState
            illustration={<EmptyActivityIllustration />}
            compact
            title="No updates yet"
            description="Check-ins on key results will appear here."
          />
        </PmPanel>
      ) : (
        <PmPanel className="space-y-0 p-3">
          {updates.map((update) => (
            <div key={update.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="mt-1.5 h-2 w-2 rounded-full bg-primary" />
                <div className="w-px flex-1 bg-border" />
              </div>
              <div className="min-w-0 pb-3">
                <p className={cn(TEXT_BODY, "text-sm")}>
                  <span className="font-medium">{update.userName ?? "Someone"}</span>
                  {update.previousValue !== null && update.newValue !== null ? (
                    <>
                      {" updated a key result from "}
                      <span className="font-normal tabular-nums">{update.previousValue}</span>
                      {" to "}
                      <span className="font-normal tabular-nums">{update.newValue}</span>
                    </>
                  ) : (
                    " posted an update"
                  )}
                </p>
                {update.note ? (
                  <p className={cn(TEXT_BODY, "mt-0.5 text-xs text-muted-foreground")}>
                    {update.note}
                  </p>
                ) : null}
                <p className="mt-0.5 text-dense text-muted-foreground">
                  {formatDistanceToNow(new Date(update.createdAt), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))}
        </PmPanel>
      )}
    </PmSection>
  );
}
