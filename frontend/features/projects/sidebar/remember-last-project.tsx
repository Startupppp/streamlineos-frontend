"use client";

import { useEffect } from "react";
import { setLastProjectId } from "@/lib/projects/last-project";

export function RememberLastProject({ projectId }: { projectId: string }) {
  useEffect(() => {
    setLastProjectId(projectId);
  }, [projectId]);

  return null;
}
