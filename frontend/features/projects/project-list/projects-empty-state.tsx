"use client";

import { useCallback } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyProjectsIllustration } from "@/components/illustrations";
import { useCan } from "@/hooks/api/access";

interface ProjectsEmptyStateProps {
  onCreate?: () => void;
}

export function ProjectsEmptyState({ onCreate }: ProjectsEmptyStateProps) {
  const canCreate = useCan("projects:create");

  const handleCreate = useCallback(() => {
    onCreate?.();
  }, [onCreate]);

  return (
    <EmptyState
      className="h-full flex-1 border-0 bg-transparent"
      illustration={<EmptyProjectsIllustration />}
      title="No projects yet"
      description="Create your first project to start organizing work."
      action={
        canCreate && onCreate
          ? { label: "Create your first project", onClick: handleCreate }
          : undefined
      }
    />
  );
}
