"use client";

import { createContext, useContext } from "react";
import type { ProjectWithDetails } from "@/types/projects";

const ProjectHydrationContext = createContext<ProjectWithDetails | undefined>(
  undefined,
);

export function ProjectHydrationProvider({
  children,
  project,
}: {
  children: React.ReactNode;
  project: ProjectWithDetails;
}) {
  return (
    <ProjectHydrationContext.Provider value={project}>
      {children}
    </ProjectHydrationContext.Provider>
  );
}

export function useHydratedProject(projectId: number) {
  const project = useContext(ProjectHydrationContext);
  return project?.id === projectId ? project : undefined;
}
