"use client";

import { memo } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowRight, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ProjectListItem } from "@/types/projects";
import {
  healthConfig,
  statusConfig,
  DEFAULT_STATUS_CONFIG,
  toDate,
  type HealthStatus,
} from "./portfolio-config";

function getProjectHealth(project: ProjectListItem): HealthStatus {
  if (project.status === "COMPLETED") return "on-track";
  if (project.status === "ARCHIVED") return "critical";
  const end = toDate(project.endDate);
  if (end && end < new Date()) return "critical";
  return "on-track";
}

interface ProjectHealthCardProps {
  project: ProjectListItem;
}

export const ProjectHealthCard = memo(function ProjectHealthCard({ project }: ProjectHealthCardProps) {
  const health = getProjectHealth(project);
  const hc = healthConfig[health];
  const sc = project.status ? (statusConfig[project.status] ?? DEFAULT_STATUS_CONFIG) : DEFAULT_STATUS_CONFIG;
  const endDate = toDate(project.endDate);
  const managerName = project.manager
    ? [project.manager.firstName, project.manager.lastName].filter(Boolean).join(" ") || null
    : null;

  return (
    <div className="rounded-lg border border-border bg-card p-5 flex flex-col gap-3 hover:shadow-md transition-shadow h-full">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[11px] font-bold text-slate-400 font-mono shrink-0">{project.key}</span>
          <h3 className="font-semibold text-foreground truncate text-sm">{project.name}</h3>
        </div>
        <Badge variant="outline" className={cn("text-[10px] shrink-0 border", sc.color)}>
          {sc.label}
        </Badge>
      </div>

      {project.description && (
        <p className="text-xs text-muted-foreground line-clamp-2">{project.description}</p>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <div className={cn("flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium", hc.bg, hc.color)}>
          <div className={cn("h-1.5 w-1.5 rounded-full", hc.dot)} />
          {hc.label}
        </div>
        {project.progress.total > 0 && (
          <span className="text-[11px] text-muted-foreground">{project.progress.percentage}% done</span>
        )}
      </div>

      {project.progress.total > 0 && (
        <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-[width] duration-500 ease-out"
            style={{ width: `${project.progress.percentage}%` }}
          />
        </div>
      )}

      <div className="flex flex-col gap-1">
        {endDate && (
          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3 shrink-0" />
            Due {format(endDate, "MMM d, yyyy")}
          </p>
        )}
        {managerName && (
          <p className="text-[11px] text-muted-foreground truncate">Manager: {managerName}</p>
        )}
      </div>

      <div className="mt-auto pt-2 border-t border-border">
        <Link href={`/projects/${project.id}`}>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground hover:text-foreground -ml-1 active:scale-[0.98]"
          >
            View Project
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </Link>
      </div>
    </div>
  );
});
