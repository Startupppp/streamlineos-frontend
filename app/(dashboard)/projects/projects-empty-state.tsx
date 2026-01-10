"use client";

import { FolderOpen } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

export function ProjectsEmptyState() {
  return (
    <EmptyState
      icon={FolderOpen}
      title="No projects found"
      description="Create your first project to start organizing work."
    />
  );
}


