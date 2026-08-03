"use client";

import { useCallback } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import { EmptyProjectsIllustration } from "@/components/illustrations";
import { useCan } from "@/hooks/api/access";

interface ProjectsEmptyStateProps {
  onCreate?: () => void;
}

export function ProjectsEmptyState({ onCreate }: ProjectsEmptyStateProps) {
  const canCreate = useCan("build:create");

  const handleCreate = useCallback(() => {
    onCreate?.();
  }, [onCreate]);

  return (
    <EmptyState
      className={CONTENT_FILL_PANEL}
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
