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
      href={`/build/${projectId}`}
      onClick={(e) => e.stopPropagation()}
      title={projectName}
      className={cn(
        "inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium tabular-nums",
        "bg-primary/10 text-primary ring-1 ring-primary/10 transition-colors duration-150 hover:bg-primary/15 hover:ring-primary/20",
        className,
      )}
    >
      {projectKey}
    </Link>
  );
}
