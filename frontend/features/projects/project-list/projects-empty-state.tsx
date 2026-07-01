"use client";

import { useState, useCallback } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyProjectsIllustration } from "@/components/illustrations";
import { NewProjectDialog } from "./new-project-dialog";

export function ProjectsEmptyState() {
  const [open, setOpen] = useState(false);
  const handleCreate = useCallback(() => setOpen(true), []);

  return (
    <>
      <EmptyState
        className="flex-1 h-full"
        illustration={<EmptyProjectsIllustration />}
        title="No projects found"
        description="Create your first project to start organizing work."
        action={{ label: "Create your first project", onClick: handleCreate }}
      />
      <NewProjectDialog open={open} onOpenChange={setOpen} trigger={<span className="hidden" />} />
    </>
  );
}
