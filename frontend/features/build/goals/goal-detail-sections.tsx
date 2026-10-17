"use client";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  EmptyTasksIllustration,
  EmptyActivityIllustration,
} from "@/components/illustrations";
import { ListChecks, Link2, History, Gauge } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  PmPanel,
  PmSection,
} from "@/components/pm-chrome";
import { TEXT_BODY } from "@/lib/text-overflow";
import { cn } from "@/lib/utils";
import type { KeyResult, GoalDetail } from "@/hooks/api/goals";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { PlusIcon } from "@animateicons/react/lucide";
import { KeyResultRow } from "@/features/build/goals/key-result-row";
import { LinkRow } from "@/features/build/goals/link-row";

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
    <PmSection index={1} className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex items-center gap-2">
        <ListChecks className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-medium">Key Results</h2>
        <Badge variant="secondary" className="text-micro">
          {keyResults.length}
        </Badge>
      </div>
      {keyResults.length === 0 ? (
        <PmPanel className="flex min-h-0 flex-1 items-center justify-center border-border bg-card p-4 shadow-sm">
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
    <PmSection index={2} className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Link2 className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-medium">Linked Work Items</h2>
          <Badge variant="secondary" className="text-micro">
            {links.length}
          </Badge>
        </div>
        {canManage ? (
          <AnimatedIconButton size="sm" variant="outline" icon={PlusIcon} iconSize={14} iconClassName="mr-1" onClick={onOpenAddLink}>
            Link
          </AnimatedIconButton>
        ) : null}
      </div>
      {links.length === 0 ? (
        <PmPanel className="flex min-h-0 flex-1 items-center justify-center border-border bg-card p-4 shadow-sm">
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

interface GoalOutcomesSectionProps {
  measurementSources: GoalDetail["measurementSources"];
  roadmapItems: GoalDetail["linkedRoadmapItems"];
}

function outcomeFigures(source: GoalDetail["measurementSources"][number]): string {
  const unit = source.unit ? ` ${source.unit}` : "";
  return [source.baseline, source.target, source.actual]
    .map((value) => {
      if (value === null) return "—";
      const numeric = Number(value);
      return `${Number.isFinite(numeric) ? numeric.toLocaleString() : value}${unit}`;
    })
    .join(" → ");
}

export function GoalOutcomesSection({ measurementSources, roadmapItems }: GoalOutcomesSectionProps) {
  if (measurementSources.length === 0 && roadmapItems.length === 0) {
    return (
      <PmPanel className="flex min-h-0 flex-1 items-center justify-center border-border bg-card p-4 shadow-sm">
        <EmptyState
          illustration={<EmptyActivityIllustration />}
          compact
          title="No outcomes yet"
          description="Roadmap items and outcome reviews that measure this goal will appear here."
        />
      </PmPanel>
    );
  }
  return (
    <PmSection index={4} className="flex min-h-0 flex-1 flex-col gap-3">
      {measurementSources.length > 0 ? (
        <>
          <div className="flex items-center gap-2">
            <Gauge className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-medium">Outcome reviews</h2>
            <Badge variant="secondary" className="text-micro">{measurementSources.length}</Badge>
          </div>
          <PmPanel className="divide-y divide-border">
            {measurementSources.map((source) => (
              <div key={source.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
                <div className="min-w-0">
                  <p className={cn(TEXT_BODY, "text-sm font-medium")}>{source.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {source.metric ?? "Metric not set"} · {outcomeFigures(source)}
                  </p>
                </div>
                <Badge variant="outline" className="capitalize">{source.result ?? source.state}</Badge>
              </div>
            ))}
          </PmPanel>
        </>
      ) : null}
      {roadmapItems.length > 0 ? (
        <>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-medium">Roadmap items</h2>
            <Badge variant="secondary" className="text-micro">{roadmapItems.length}</Badge>
          </div>
          <PmPanel className="divide-y divide-border">
            {roadmapItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-2 p-3">
                <p className={cn(TEXT_BODY, "text-sm")}>{item.title}</p>
                <span className="text-xs capitalize text-muted-foreground">
                  {item.horizon} · {item.status.replace("_", " ")}
                </span>
              </div>
            ))}
          </PmPanel>
        </>
      ) : null}
    </PmSection>
  );
}

interface GoalUpdatesTimelineProps {
  updates: GoalDetail["updates"];
}

export function GoalUpdatesTimeline({ updates }: GoalUpdatesTimelineProps) {
  return (
    <PmSection index={3} className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex items-center gap-2">
        <History className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-medium">Updates Timeline</h2>
      </div>
      {updates.length === 0 ? (
        <PmPanel className="flex min-h-0 flex-1 items-center justify-center border-border bg-card p-4 shadow-sm">
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
