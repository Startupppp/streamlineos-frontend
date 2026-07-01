"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AvatarStack } from "@/components/ui/avatar-stack";
import {
  getColorSafe,
  projectStatusColors,
  projectStatusDisplayLabels,
} from "@/lib/theme-constants";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface ProjectCardProps {
  project: {
    id: number;
    name: string;
    key: string;
    status: string | null;
    description: string | null;
    startDate: Date | string | null;
    endDate: Date | string | null;
    manager: {
      id: string;
      firstName: string | null;
      lastName: string | null;
      image: string | null;
    } | null;
    progress: { total: number; done: number; percentage: number };
    members: { id: string; firstName: string | null; lastName: string | null; image: string | null }[];
  };
}

const projectStatusAccent: Record<string, string> = {
  ACTIVE: "border-l-violet-600",
  PLANNING: "border-l-indigo-500",
  COMPLETED: "border-l-slate-400",
  ON_HOLD: "border-l-amber-500",
  ARCHIVED: "border-l-slate-300",
};

export const ProjectCard = React.memo(function ProjectCard({ project }: ProjectCardProps) {
  const status = project.status ?? "ACTIVE";
  const displayLabel = projectStatusDisplayLabels[status] ?? status;
  const statusColor = getColorSafe(projectStatusColors, status);
  const statusAccent = getColorSafe(projectStatusAccent, status);
  const dateStr = project.startDate
    ? format(new Date(project.startDate), "MMM d")
    : null;
  const progressValue = project.progress.total > 0 ? project.progress.percentage : 0;
  const progressLabel =
    project.progress.total > 0
      ? `${project.progress.done}/${project.progress.total}`
      : "0/0";

  return (
    <Link
      href={`/projects/${project.id}`}
      aria-label={`${project.name} — ${displayLabel}`}
      className="block h-full"
    >
      <motion.div
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className={cn(
          "relative overflow-hidden rounded-2xl border border-slate-200/80 border-l-[3px] bg-white/90 backdrop-blur-sm p-3 shadow-xl shadow-slate-200/60",
          "flex h-full flex-col group cursor-pointer",
          "transition-all duration-200 hover:scale-[1.02] hover:border-violet-500/30 hover:bg-violet-50 hover:shadow-md hover:shadow-violet-100/50 hover:ring-1 hover:ring-violet-500/20",
          statusAccent,
        )}
        role="listitem"
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent"
          aria-hidden="true"
        />

        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="rounded-md bg-violet-50 px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wide text-violet-600/90">
            {project.key}
          </span>
          <Badge
            variant="secondary"
            className={cn(
              "rounded-full border-0 px-2 py-0 text-[9px] font-semibold uppercase tracking-wide",
              statusColor,
            )}
          >
            {displayLabel}
          </Badge>
        </div>

        <h3 className="mb-0.5 line-clamp-1 text-sm font-bold text-slate-900 transition-colors group-hover:text-violet-700">
          {project.name}
        </h3>

        {project.description ? (
          <p className="mb-2 line-clamp-1 text-[11px] text-muted-foreground">
            {project.description}
          </p>
        ) : (
          <p className="mb-2 line-clamp-1 text-[10px] italic text-muted-foreground/45">
            No description
          </p>
        )}

        <div className="mt-auto border-t border-slate-100/80 pt-2">
          <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
            <span className="font-medium">Progress</span>
            <span className="tabular-nums font-medium">{progressLabel}</span>
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-slate-100">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-violet-600 to-indigo-600"
              initial={{ width: 0 }}
              animate={{ width: `${progressValue}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>

          <div className="mt-2 flex items-center justify-between">
            <AvatarStack
              users={project.members}
              limit={4}
              className="[&>div]:h-5 [&>div]:w-5"
            />
            {dateStr && (
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Calendar className="h-3 w-3 shrink-0" aria-hidden="true" />
                {dateStr}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </Link>
  );
});
