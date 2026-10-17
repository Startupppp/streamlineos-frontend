"use client";

import { useMemo } from "react";
import { useProject } from "@/hooks/api/build/projects";
import type { ProjectMember } from "./types";

interface ProjectManager {
  id: string;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  image?: string | null;
  email?: string | null;
}

function isProjectWithManager(data: unknown): data is { manager?: ProjectManager } {
  return typeof data === "object" && data !== null && "manager" in data;
}

export function useTicketDetailProjectData(projectId: number) {
  const { data: projectData } = useProject(projectId);

  const members = useMemo<ProjectMember[]>(() => {
    if (!projectData?.members) return [];
    const list = projectData.members.flatMap((m) => {
      const user = m.user;
      if (!user) return [];
      return [
        {
          id: user.id,
          name: user.name || `${user.firstName || ""} ${user.lastName || ""}`.trim(),
          firstName: user.firstName || undefined,
          lastName: user.lastName || undefined,
          image: user.image || null,
          email: user.email || "",
        },
      ];
    });
    const mgr = isProjectWithManager(projectData) ? projectData.manager : undefined;
    if (mgr && !list.some((m) => m.id === mgr.id)) {
      list.unshift({
        id: mgr.id,
        name: mgr.name || `${mgr.firstName || ""} ${mgr.lastName || ""}`.trim(),
        firstName: mgr.firstName || undefined,
        lastName: mgr.lastName || undefined,
        image: mgr.image || null,
        email: mgr.email || "",
      });
    }
    return list;
  }, [projectData]);

  const statuses = useMemo(() => {
    if (!projectData) return undefined;
    const raw: unknown = "statuses" in projectData ? projectData.statuses : undefined;
    if (!Array.isArray(raw)) return undefined;
    return raw.flatMap((item) => {
      if (
        typeof item === "object" &&
        item !== null &&
        "id" in item &&
        typeof item.id === "number" &&
        "name" in item &&
        typeof item.name === "string"
      ) {
        return [{ id: item.id, name: item.name }];
      }
      return [];
    });
  }, [projectData]);

  return { projectData, members, statuses };
}
