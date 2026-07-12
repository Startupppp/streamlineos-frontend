"use client";

import { memo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ResourceAllocationEntry } from "@/types/projects";

const PROJECT_DOT_COLORS = [
  "bg-blue-500",
  "bg-violet-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-indigo-500",
];

function getInitials(name: string | null, email: string) {
  if (name) {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  }
  return email.substring(0, 2).toUpperCase();
}

function getLoadStyle(totalOpen: number) {
  if (totalOpen > 10) {
    return { bar: "bg-red-500", badge: "destructive" as const };
  }
  if (totalOpen > 5) {
    return { bar: "bg-amber-500", badge: "secondary" as const };
  }
  return { bar: "bg-blue-500", badge: "outline" as const };
}

interface ResourceAllocationMemberCardProps {
  entry: ResourceAllocationEntry;
  utilPct: number;
  memberIndex: number;
}

export const ResourceAllocationMemberCard = memo(function ResourceAllocationMemberCard({
  entry,
  utilPct,
  memberIndex,
}: ResourceAllocationMemberCardProps) {
  const displayName = entry.user.name ?? entry.user.email;
  const showEmail = entry.user.name !== null;
  const loadStyle = getLoadStyle(entry.totalOpen);

  return (
    <div className="rounded-xl border border-border bg-card p-2.5 shadow-sm transition-[box-shadow,border-color] duration-200 hover:border-border/80 hover:shadow-md motion-reduce:transition-none">
      <div className="flex items-start gap-2.5 min-w-0">
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarImage src={entry.user.image ?? undefined} />
          <AvatarFallback className="text-[10px] font-medium">
            {getInitials(entry.user.name, entry.user.email)}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium leading-tight text-foreground">
                {displayName}
              </p>
              {showEmail && (
                <p className="truncate text-[10px] leading-tight text-muted-foreground">
                  {entry.user.email}
                </p>
              )}
            </div>

            <div className="hidden items-center gap-1.5 sm:flex shrink-0 w-[4.5rem]">
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full transition-[width] duration-300 ease-out motion-reduce:transition-none",
                    loadStyle.bar,
                  )}
                  style={{ width: `${utilPct}%` }}
                />
              </div>
            </div>

            <Badge
              variant={loadStyle.badge}
              className="h-5 shrink-0 px-1.5 py-0 text-[10px] tabular-nums"
            >
              {entry.totalOpen} open
            </Badge>
          </div>

          <div className="h-1 overflow-hidden rounded-full bg-muted sm:hidden">
            <div
              className={cn(
                "h-full rounded-full transition-[width] duration-300 ease-out motion-reduce:transition-none",
                loadStyle.bar,
              )}
              style={{ width: `${utilPct}%` }}
            />
          </div>

          {entry.byProject.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {entry.byProject.map((project, projectIndex) => (
                <span
                  key={project.projectId}
                  className="inline-flex max-w-full items-center gap-1 rounded-md bg-muted/60 px-1.5 py-0.5 text-[10px]"
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 shrink-0 rounded-full",
                      PROJECT_DOT_COLORS[(projectIndex + memberIndex) % PROJECT_DOT_COLORS.length],
                    )}
                    aria-hidden="true"
                  />
                  <span className="shrink-0 font-mono font-medium text-muted-foreground">
                    {project.projectKey}
                  </span>
                  <span className="truncate text-foreground/80">{project.projectName}</span>
                  <span className="shrink-0 font-semibold tabular-nums text-foreground">
                    {project.open}
                  </span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
