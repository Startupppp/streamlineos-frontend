import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { ProjectSidebar } from "@/components/layout/project-sidebar";
import { isApiError } from "@/lib/api-client";
import { serverApiClient } from "@/lib/api/server-client";
import type { ProjectWithDetails } from "@/types/projects";
import { AccessDeniedView } from "@/features/projects/project-detail/access-denied-view";
import { BackendUnavailableView } from "@/features/projects/project-detail/backend-unavailable-view";

function getApiErrorDetails(error: { details?: unknown }): Record<string, unknown> | undefined {
  const detailsRaw = error.details;
  if (detailsRaw !== null && typeof detailsRaw === "object") {
    return detailsRaw as Record<string, unknown>;
  }
  return undefined;
}

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

  const cookieStore = await cookies();
  const defaultCollapsed =
    cookieStore.get("project-sidebar-collapsed")?.value === "true";

  let project: ProjectWithDetails | null = null;
  try {
    project = await serverApiClient.get<ProjectWithDetails>(`/projects/${numId}`);
  } catch (err: unknown) {
    if (isApiError(err)) {
      if (err.code === "BACKEND_UNREACHABLE") {
        return <BackendUnavailableView />;
      }
      const status = err.status;
      const code = err.code;
      const details = getApiErrorDetails(err);
      const reason = typeof details?.reason === "string" ? details.reason : undefined;
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
        defaultCollapsed={defaultCollapsed}
      />
      <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}
