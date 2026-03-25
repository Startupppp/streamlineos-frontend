"use client";

import React from "react";
import Link from "next/link";
import { Calendar, MoreVertical, Settings, LayoutDashboard } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AvatarStack } from "@/components/ui/avatar-stack";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  getColorSafe,
  projectStatusColors,
  projectStatusDisplayLabels,
} from "@/lib/theme-constants";
import { format } from "date-fns";

interface ProjectListRowProps {
  project: {
    id: number;
    name: string;
    key: string;
    status: string | null;
    startDate: Date | string | null;
    progress: { total: number; done: number; percentage: number };
    members: { id: string; firstName: string | null; lastName: string | null; image: string | null }[];
  };
}

export const ProjectListRow = React.memo(function ProjectListRow({ project }: ProjectListRowProps) {
  const status = project.status ?? "ACTIVE";
  const displayLabel = projectStatusDisplayLabels[status] ?? status;
  const statusColor = getColorSafe(projectStatusColors, status);
  const dateStr = project.startDate
    ? format(new Date(project.startDate), "MMM d, yyyy")
    : null;

  return (
    <Link href={`/projects/${project.id}`} aria-label={`${project.name} — ${displayLabel}`}>
      <div
        className="flex items-center gap-4 p-4 rounded-lg border border-border bg-card hover:shadow-sm hover:bg-muted/30 transition-all group"
        role="listitem"
      >
        {/* Status badge */}
        <Badge variant="secondary" className={`text-[10px] font-semibold uppercase tracking-wider shrink-0 ${statusColor}`}>
          {displayLabel}
        </Badge>

        {/* Name & key */}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
            {project.name}
          </p>
          <p className="text-xs text-muted-foreground">{project.key}</p>
        </div>

        {/* Avatar stack */}
        <div className="hidden md:block shrink-0">
          <AvatarStack users={project.members} limit={3} className="[&>div]:h-6 [&>div]:w-6" />
        </div>

        {/* Date */}
        {dateStr && (
          <div className="hidden lg:flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
            <Calendar className="h-3.5 w-3.5" />
            <span>{dateStr}</span>
          </div>
        )}

        {/* Three-dot menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0"
              aria-label={`Actions for ${project.name}`}
              onClick={(e) => e.preventDefault()}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/projects/${project.id}`} onClick={(e) => e.stopPropagation()}>
                <LayoutDashboard className="mr-2 h-4 w-4" />
                View Board
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/projects/${project.id}/settings`} onClick={(e) => e.stopPropagation()}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Link>
  );
});
