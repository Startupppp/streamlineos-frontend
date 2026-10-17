"use client";

import { Calendar, Ticket } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, resolveImageUrl } from "@/lib/utils";
import {
  getUserDisplayName,
  getUserInitials,
} from "@/lib/person-display";
import { TEXT_FLEX_CHILD } from "@/lib/text-overflow";
import { TruncatedText } from "@/components/ui/truncated-text";
import type { ProjectListItem } from "@/types/projects/projects";
import { InlineProjectDates } from "./project-field-dates";
import {
  dateToneClasses,
  resolveDateMeta,
} from "./project-card-utils";

interface ProjectCardFooterProps {
  project: ProjectListItem;
  canEdit: boolean;
}

export function ProjectCardFooter({
  project,
  canEdit,
}: ProjectCardFooterProps) {
  const status = project.status ?? "ACTIVE";
  const dateMeta = resolveDateMeta(project.endDate, project.startDate, status);
  const progressValue =
    project.progress.total > 0 ? project.progress.percentage : 0;
  const hasTickets = project.progress.total > 0;
  const leadName = getUserDisplayName(project.manager);

  return (
    <div
      data-testid="project-card-footer"
      className="mt-2.5 border-t border-border/60 pt-2.5"
    >
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div className={cn(TEXT_FLEX_CHILD, "flex min-w-0 items-center gap-1.5")}>
          <Avatar className="size-5 shrink-0">
            {project.manager?.image ? (
              <AvatarImage
                src={resolveImageUrl(project.manager.image)}
                alt=""
              />
            ) : null}
            <AvatarFallback className="text-micro">
              {getUserInitials(project.manager)}
            </AvatarFallback>
          </Avatar>
          <span className="sr-only">Lead: </span>
          <TruncatedText
            text={leadName}
            className="text-label text-muted-foreground"
          />
        </div>

        {canEdit ? (
          <InlineProjectDates
            projectId={project.id}
            currentStartDate={project.startDate}
            currentEndDate={project.endDate}
            currentStatus={status}
          />
        ) : dateMeta ? (
          <div
            className={cn(
              "flex shrink-0 items-center gap-1 text-micro font-normal tabular-nums",
              dateToneClasses[dateMeta.tone],
            )}
          >
            <Calendar className="size-3 shrink-0" aria-hidden="true" />
            {dateMeta.label}
          </div>
        ) : (
          <span className="shrink-0 text-micro text-muted-foreground">No target</span>
        )}
      </div>

      {hasTickets ? (
        <div className="mt-2 flex items-center gap-2">
          <div
            className="h-1 min-w-12 flex-1 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={progressValue}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${project.name} progress`}
            aria-valuetext={`${progressValue}% complete`}
          >
            <div
              className={cn(
                "h-full rounded-full transition-[width] duration-300 ease-out motion-reduce:transition-none",
                progressValue >= 100
                  ? "bg-status-success-fill"
                  : "bg-primary",
              )}
              style={{ width: `${progressValue}%` }}
            />
          </div>
          <span className="shrink-0 text-micro tabular-nums text-foreground">
            {progressValue}%
          </span>
          <span className="shrink-0 text-micro tabular-nums text-muted-foreground">
            {project.progress.done}/{project.progress.total}
          </span>
        </div>
      ) : (
        <div className="mt-2 flex items-center gap-1.5 text-micro text-muted-foreground">
          <Ticket className="size-3 shrink-0" aria-hidden="true" />
          <span>No tickets yet</span>
        </div>
      )}
    </div>
  );
}
