import { notFound } from "next/navigation";
import { ProjectSidebar } from "@/components/layout/project-sidebar";
import { serverApiClient } from "@/lib/api/server-client";
import type { ProjectWithDetails } from "@/types/projects";
import { AccessDeniedView } from "./access-denied-view";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const numId = Number(projectId);
  if (isNaN(numId)) return notFound();

  let project: ProjectWithDetails | null = null;
  try {
    project = await serverApiClient.get<ProjectWithDetails>(`/projects/${numId}`);
  } catch {
    return <AccessDeniedView projectName="this project" />;
  }

  if (!project) return notFound();

  return (
    <div className="flex flex-col md:flex-row h-full w-full">
      <ProjectSidebar
        projectId={projectId}
        projectName={project.name}
        projectKey={project.key}
      />
      <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
