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
import { InlineProjectDates } from "./project-card-inline-fields";
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
    <div className="mt-auto space-y-2 border-t border-border/60 pt-3">
      <div className={cn(TEXT_FLEX_CHILD, "flex items-center gap-1.5")}>
        <Avatar className="h-5 w-5 shrink-0">
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

      {hasTickets ? (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-micro font-normal tabular-nums text-muted-foreground">
              <span className="text-foreground">{progressValue}%</span> complete
            </span>
            <span className="text-micro tabular-nums text-muted-foreground">
              {project.progress.done}/{project.progress.total}
            </span>
          </div>
          <div
            className="h-1 overflow-hidden rounded-full bg-muted"
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
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-micro text-muted-foreground">
          <Ticket className="h-3 w-3 shrink-0" aria-hidden="true" />
          <span>No tickets yet</span>
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <span className="text-micro text-muted-foreground">Target</span>
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
            <Calendar className="h-3 w-3 shrink-0" aria-hidden="true" />
            {dateMeta.label}
          </div>
        ) : (
          <span className="text-micro text-muted-foreground">—</span>
        )}
      </div>
    </div>
  );
}
