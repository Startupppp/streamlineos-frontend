"use client";

import { memo, useCallback } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ListChecks, ListTodo } from "lucide-react";
import { PlayIcon, Trash2Icon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getColorSafe } from "@/lib/theme-constants";
import { cn } from "@/lib/utils";
import type { ProjectTemplate } from "@/hooks/api/projects";
import { PM_PANEL } from "@/features/projects/shared/pm-chrome";
import { listItem, listItemReduced, pmSnappy } from "@/features/projects/shared/pm-motion";
import { TEXT_ONE_LINE, TEXT_TWO_LINES } from "@/features/projects/shared/text-overflow";
import {
  categoryAccentBar,
  categoryAvatarTints,
  categoryBadgeColors,
  categoryDotColors,
  formatCategoryLabel,
  getPreviewTickets,
  getTemplateInitials,
  ticketTypeColors,
} from "./template-card-utils";

interface TemplateCardProps {
  template: ProjectTemplate;
  onApply: (template: ProjectTemplate) => void;
  onDelete: (template: ProjectTemplate) => void;
}

function TemplateCardActions({
  templateName,
  onApply,
  onDelete,
}: {
  templateName: string;
  onApply: () => void;
  onDelete: () => void;
}) {
  const { iconRef: playRef, hoverHandlers: playHandlers } = useAnimatedIcon();
  const { iconRef: trashRef, hoverHandlers: trashHandlers } = useAnimatedIcon();
  return (
    <div className="flex gap-2">
      <Button size="sm" className="flex-1" onClick={onApply} {...playHandlers}>
        <PlayIcon ref={playRef} size={14} className="mr-1" aria-hidden="true" />
        Use Template
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="shrink-0 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={onDelete}
        aria-label={`Delete ${templateName} template`}
        {...trashHandlers}
      >
        <Trash2Icon ref={trashRef} size={14} aria-hidden="true" />
      </Button>
    </div>
  );
}

interface TaskPreviewRowProps {
  index: number;
  title: string;
  type: string;
  phase: string | null;
}

const TaskPreviewRow = memo(function TaskPreviewRow({
  index,
  title,
  type,
  phase,
}: TaskPreviewRowProps) {
  const typeColor = getColorSafe(ticketTypeColors, type);

  return (
    <div className="flex min-w-0 items-center gap-2 rounded-md bg-muted/40 px-2 py-1.5">
      <span
        className="w-3 shrink-0 text-center text-[10px] tabular-nums text-muted-foreground/50"
        aria-hidden="true"
      >
        {index + 1}
      </span>
      <span
        className={cn(
          "shrink-0 rounded px-1 py-px text-[9px] font-semibold uppercase tracking-wide",
          typeColor,
        )}
      >
        {type}
      </span>
      <span className={cn(TEXT_ONE_LINE, "flex-1 text-[11px] text-foreground/90")} title={title}>
        {title}
      </span>
      {phase ? (
        <span className="shrink-0 rounded bg-muted px-1 py-px text-[9px] text-muted-foreground">
          {phase}
        </span>
      ) : null}
    </div>
  );
});

export const TemplateCard = memo(function TemplateCard({
  template,
  onApply,
  onDelete,
}: TemplateCardProps) {
  const shouldReduceMotion = useReducedMotion();
  const handleApply = useCallback(() => onApply(template), [onApply, template]);
  const handleDelete = useCallback(() => onDelete(template), [onDelete, template]);

  const category = template.category || "GENERAL";
  const accentBar = getColorSafe(categoryAccentBar, category);
  const badgeColor = getColorSafe(categoryBadgeColors, category);
  const dotColor = getColorSafe(categoryDotColors, category);
  const avatarTint = getColorSafe(categoryAvatarTints, category);
  const initials = getTemplateInitials(template.name);
  const taskCount = template.tickets.length;
  const hasTasks = taskCount > 0;
  const { preview, overflow } = getPreviewTickets(template.tickets);

  return (
    <motion.div
      variants={shouldReduceMotion ? listItemReduced : listItem}
      transition={pmSnappy}
      className="h-full min-w-0"
    >
      <div
        className={cn(
          PM_PANEL,
          "group relative flex h-full flex-col overflow-hidden p-3",
          "transition-[border-color,box-shadow] duration-200 ease-out motion-reduce:transition-none",
          "hover:border-primary/35 hover:shadow-md",
        )}
        role="listitem"
        aria-label={`${template.name} template — ${formatCategoryLabel(category)}, ${taskCount} tasks`}
      >
        <div className={cn("absolute inset-x-0 top-0 h-0.5", accentBar)} aria-hidden="true" />

        <div className="mb-2.5 flex min-w-0 items-start gap-2.5">
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset",
              "text-[11px] font-bold tracking-tight",
              avatarTint,
            )}
            aria-hidden="true"
          >
            {initials}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-start justify-between gap-2">
              <h3
                className={cn(
                  TEXT_ONE_LINE,
                  "text-sm font-semibold text-foreground transition-colors group-hover:text-primary",
                )}
                title={template.name}
              >
                {template.name}
              </h3>
              <span className="inline-flex shrink-0 items-center gap-0.5 rounded-md bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
                <ListChecks className="h-2.5 w-2.5" aria-hidden="true" />
                {taskCount} {taskCount === 1 ? "task" : "tasks"}
              </span>
            </div>

            <Badge
              variant="secondary"
              className={cn(
                "mt-1.5 gap-1 rounded-full border-0 px-2 py-0 text-[9px] font-semibold uppercase tracking-wide",
                badgeColor,
              )}
            >
              <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dotColor)} aria-hidden="true" />
              {formatCategoryLabel(category)}
            </Badge>
          </div>
        </div>

        {template.description ? (
          <p
            className={cn(TEXT_TWO_LINES, "mb-2.5 flex-1 text-[11px] leading-relaxed text-muted-foreground")}
            title={template.description}
          >
            {template.description}
          </p>
        ) : (
          <div className="mb-2.5 flex-1" aria-hidden="true" />
        )}

        <div className="mt-auto space-y-2.5 border-t border-border/60 pt-2.5">
          {hasTasks ? (
            <div className="space-y-1" role="list" aria-label="Task preview">
              {preview.map((ticket, idx) => (
                <TaskPreviewRow
                  key={ticket.id}
                  index={idx}
                  title={ticket.title}
                  type={ticket.type}
                  phase={ticket.phase}
                />
              ))}
              {overflow > 0 ? (
                <p className="pl-1 text-[10px] text-muted-foreground">
                  +{overflow} more {overflow === 1 ? "task" : "tasks"}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-dashed border-border/70 bg-muted/30 px-2.5 py-2">
              <ListTodo
                className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50"
                aria-hidden="true"
              />
              <span className="text-[10px] text-muted-foreground/70">No tasks defined</span>
            </div>
          )}

          <TemplateCardActions
            templateName={template.name}
            onApply={handleApply}
            onDelete={handleDelete}
          />
        </div>
      </div>
    </motion.div>
  );
});
