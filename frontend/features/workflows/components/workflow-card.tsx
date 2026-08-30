"use client";

import { memo } from "react";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { CopyIcon, Trash2Icon } from "@animateicons/react/lucide";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { cn } from "@/lib/utils";
import { type Workflow, type WorkflowStatus } from "@/hooks/api/workflows";

const STATUS_BADGE_CLASS: Record<WorkflowStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  published: "bg-status-success-surface text-status-success-ink",
  disabled: "bg-status-warning-surface text-status-warning-ink",
  archived: "bg-status-danger-surface text-status-danger-ink",
};

const STATUS_LEFT_BORDER: Record<WorkflowStatus, string> = {
  draft: "border-l-border",
  published: "border-l-green-400",
  disabled: "border-l-yellow-400",
  archived: "border-l-red-400",
};

interface WorkflowCardProps {
  workflow: Workflow;
  onDuplicate: () => void;
  onDelete: () => void;
}

export const WorkflowCard = memo(function WorkflowCard({
  workflow,
  onDuplicate,
  onDelete,
}: WorkflowCardProps) {
  return (
    <Card
      className={cn(
        "bg-card rounded-xl border border-border shadow-sm border-l-4 transition-all duration-200 hover:shadow-md h-full",
        STATUS_LEFT_BORDER[workflow.status]
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide [&>*]:shrink-0">
              <p className="font-semibold text-sm text-foreground truncate">
                {workflow.name}
              </p>
              <span
                className={cn(
                  "inline-flex items-center px-2 py-0.5 rounded-full text-micro font-medium capitalize",
                  STATUS_BADGE_CLASS[workflow.status]
                )}
              >
                {workflow.status}
              </span>
              <span className="text-micro text-muted-foreground bg-muted border border-border px-1.5 py-0.5 rounded">
                v{workflow.version}
              </span>
            </div>

            {workflow.description && (
              <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
                {workflow.description}
              </p>
            )}

            <p className="text-dense text-muted-foreground mt-2">
              Updated{" "}
              {formatDistanceToNow(new Date(workflow.updatedAt), {
                addSuffix: true,
              })}
            </p>
          </div>

          <div className="flex items-center gap-0.5 shrink-0">
            <Button
              asChild
              size="icon"
              variant="ghost"
              className="w-7"
              aria-label="Edit workflow in builder"
            >
              <Link href={`/workflows/${workflow.id}/builder`}>
                <Pencil className="h-3.5 w-3.5" />
              </Link>
            </Button>
            <AnimatedIconButton
              icon={CopyIcon}
              iconSize={14}
              size="icon"
              variant="ghost"
              className="w-7"
              aria-label="Duplicate workflow"
              onClick={onDuplicate}
            />
            <AnimatedIconButton
              icon={Trash2Icon}
              iconSize={14}
              size="icon"
              variant="ghost"
              className="w-7 text-destructive hover:text-destructive"
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
  workflow: Workflow;
  onDuplicate: (workflow: Workflow) => void;
  onDelete: (workflow: Workflow) => void;
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
