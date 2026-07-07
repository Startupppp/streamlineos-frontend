import { notFound } from "next/navigation";
import { isAxiosError } from "axios";
import { ProjectSidebar } from "@/components/layout/project-sidebar";
import { serverApiClient } from "@/lib/api/server-client";
import type { ProjectWithDetails } from "@/types/projects";
import { AccessDeniedView } from "@/features/projects/project-detail/access-denied-view";

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
  } catch (err) {
    if (isAxiosError(err)) {
      const status = err.response?.status;
      const body = err.response?.data as Record<string, unknown> | undefined;
      const code = typeof body?.code === "string" ? body.code : undefined;
      const reason =
        typeof (body?.details as Record<string, unknown> | undefined)?.reason === "string"
          ? (body?.details as Record<string, unknown>).reason
          : undefined;
      if (status === 404 || code === "PROJECTS_NOT_FOUND") {
        return notFound();
      }
      if (status === 403 || code === "PROJECTS_FORBIDDEN_PROJECT") {
        const hint =
          reason === "NOT_A_MEMBER"
            ? "If you just created this project, it may take a moment to provision access."
            : undefined;
        return <AccessDeniedView projectName="this project" hint={hint} />;
      }
    }
    throw err;
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
