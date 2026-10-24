"use client";

import { memo } from "react";
import Link from "next/link";
import { Pencil, Workflow } from "lucide-react";
import { CopyIcon, Trash2Icon } from "@animateicons/react/lucide";
import { formatDistanceToNowStrict } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { SemanticBadge, type BadgeTone } from "@/components/ui/semantic-badge";
import { TEXT_ONE_LINE } from "@/lib/text-overflow";
import { cn } from "@/lib/utils";
import { type Workflow as WorkflowRecord, type WorkflowStatus } from "@/hooks/api/workflows";

const STATUS_TONE: Record<WorkflowStatus, BadgeTone> = {
  draft: "neutral",
  published: "success",
  disabled: "warning",
  archived: "danger",
};

const STATUS_LABEL: Record<WorkflowStatus, string> = {
  draft: "Draft",
  published: "Published",
  disabled: "Disabled",
  archived: "Archived",
};

interface WorkflowCardProps {
  workflow: WorkflowRecord;
  onDuplicate: () => void;
  onDelete: () => void;
}

export const WorkflowCard = memo(function WorkflowCard({
  workflow,
  onDuplicate,
  onDelete,
}: WorkflowCardProps) {
  const builderHref = `/workflows/${workflow.id}/builder`;
  const updatedAt = new Date(workflow.updatedAt);
  const updatedShort = formatDistanceToNowStrict(updatedAt, { addSuffix: true })
    .replace(/\sseconds?/, "s")
    .replace(/\sminutes?/, "m")
    .replace(/\shours?/, "h")
    .replace(/\sdays?/, "d")
    .replace(/\smonths?/, "mo")
    .replace(/\syears?/, "y");
  const updatedTitle = `Updated ${formatDistanceToNowStrict(updatedAt, { addSuffix: true })}`;

  return (
    <Card className="h-full border-border bg-card transition-colors hover:bg-muted/30">
      <CardContent className="flex h-full flex-col gap-3 p-4">
        <div className="flex items-start gap-3">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"
            aria-hidden="true"
          >
            <Workflow className="h-4 w-4" />
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-start justify-between gap-2">
              <Link
                href={builderHref}
                className={cn(
                  "min-w-0 text-sm font-semibold text-foreground outline-none transition-colors",
                  "hover:underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring",
                  TEXT_ONE_LINE,
                )}
                title={workflow.name}
              >
                {workflow.name}
              </Link>
              <SemanticBadge
                tone={STATUS_TONE[workflow.status]}
                label={STATUS_LABEL[workflow.status]}
                size="xs"
                className="shrink-0"
              />
            </div>

            {workflow.description ? (
              <p className="line-clamp-2 text-pretty text-xs leading-relaxed text-muted-foreground">
                {workflow.description}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-3">
          <p className="min-w-0 text-dense text-muted-foreground tabular-nums">
            <span className="font-medium text-foreground/80">v{workflow.version}</span>
            <span className="mx-1.5 text-border" aria-hidden="true">
              ·
            </span>
            <span title={updatedTitle}>{updatedShort}</span>
          </p>

          <div className="flex shrink-0 items-center gap-0.5">
            <Button asChild size="icon" variant="ghost" className="h-8 w-8">
              <Link href={builderHref} aria-label="Edit workflow in builder">
                <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </Button>
            <AnimatedIconButton
              icon={CopyIcon}
              iconSize={14}
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              aria-label="Duplicate workflow"
              onClick={onDuplicate}
            />
            <AnimatedIconButton
              icon={Trash2Icon}
              iconSize={14}
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-destructive hover:text-destructive"
              aria-label="Delete workflow"
              onClick={onDelete}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

interface WorkflowCardItemProps {
  workflow: WorkflowRecord;
  onDuplicate: (workflow: WorkflowRecord) => void;
  onDelete: (workflow: WorkflowRecord) => void;
}

export function WorkflowCardItem({
  workflow,
  onDuplicate,
  onDelete,
}: WorkflowCardItemProps) {
  function handleDuplicate() {
    onDuplicate(workflow);
  }

  function handleDelete() {
    onDelete(workflow);
  }

  return (
    <WorkflowCard
      workflow={workflow}
      onDuplicate={handleDuplicate}
      onDelete={handleDelete}
    />
  );
}
