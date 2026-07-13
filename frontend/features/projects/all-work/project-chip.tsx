"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

interface ProjectChipProps {
  projectId: number;
  projectKey: string;
  projectName?: string;
  className?: string;
}

export function ProjectChip({ projectId, projectKey, projectName, className }: ProjectChipProps) {
  return (
    <Link
      href={`/projects/${projectId}`}
      onClick={(e) => e.stopPropagation()}
      title={projectName}
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium tabular-nums",
        "bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors shrink-0 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/20",
        className
      )}
    >
      {projectKey}
    </Link>
  );
}
