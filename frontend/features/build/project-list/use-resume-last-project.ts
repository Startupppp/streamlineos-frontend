"use client";

import { useEffect, useSyncExternalStore } from "react";
import { isApiError } from "@/lib/api-client";
import { useProject } from "@/hooks/api/build/projects";
import {
  LAST_PROJECT_COOKIE_NAME,
  clearLastProjectId,
  parseLastProjectId,
} from "@/lib/projects/last-project";
import type { BuildHeaderAction } from "@/features/build/shared/build-header-actions";

function getLastProjectId(): number | null {
  const cookie = document.cookie
    .split("; ")
    .find((value) => value.startsWith(`${LAST_PROJECT_COOKIE_NAME}=`));
  return parseLastProjectId(cookie?.split("=")[1]);
}

function subscribeToLastProject(): () => void {
  return () => {};
}

function getServerLastProjectId(): null {
  return null;
}

export function useResumeLastProject(): BuildHeaderAction | null {
  const projectId = useSyncExternalStore(
    subscribeToLastProject,
    getLastProjectId,
    getServerLastProjectId,
  );
  const { data: project, isError, error } = useProject(projectId ?? 0);

  useEffect(() => {
    const gone =
      isError &&
      isApiError(error) &&
      (error.status === 404 || error.status === 403);
    if (gone || (project && project.status !== "ACTIVE")) {
      clearLastProjectId();
    }
  }, [isError, error, project]);

  if (!projectId || !project || project.status !== "ACTIVE") return null;
  return {
    id: "resume",
    label: `Resume ${project.name}`,
    href: `/build/${project.id}`,
  };
}
