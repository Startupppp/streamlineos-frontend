"use client";

import Link from "next/link";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
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

interface ProjectTableRowProps {
  project: ProjectListItem;
}

export function ProjectTableRow({ project }: ProjectTableRowProps) {
  const health = getProjectHealth(project);
  const hc = healthConfig[health];
  const sc = project.status ? (statusConfig[project.status] ?? DEFAULT_STATUS_CONFIG) : DEFAULT_STATUS_CONFIG;
  const endDate = toDate(project.endDate);
  const managerName = project.manager
    ? [project.manager.firstName, project.manager.lastName].filter(Boolean).join(" ") || null
    : null;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto_auto_minmax(100px,140px)_auto_auto] items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-[10px] font-bold text-slate-400 font-mono shrink-0 w-12 truncate">
          {project.key}
        </span>
        <Link
          href={`/projects/${project.id}`}
          className="text-sm font-medium text-foreground hover:text-blue-600 truncate transition-colors"
        >
          {project.name}
        </Link>
      </div>
      <Badge variant="outline" className={cn("text-[10px] shrink-0 border", sc.color)}>
        {sc.label}
      </Badge>
      <div className={cn("flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium shrink-0", hc.bg, hc.color)}>
        <div className={cn("h-1.5 w-1.5 rounded-full shrink-0", hc.dot)} />
        {hc.label}
      </div>
      <div className="flex items-center gap-2 min-w-0">
        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-[width] duration-500 ease-out"
            style={{ width: `${project.progress.percentage}%` }}
          />
        </div>
        <span className="text-[11px] text-muted-foreground tabular-nums shrink-0 w-8 text-right">
          {project.progress.percentage}%
        </span>
      </div>
      <span className="text-[11px] text-muted-foreground shrink-0 whitespace-nowrap">
        {endDate ? format(endDate, "MMM d, yyyy") : "—"}
      </span>
      <span className="text-[11px] text-muted-foreground truncate max-w-[100px]">
        {managerName ?? "—"}
      </span>
    </div>
  );
}
