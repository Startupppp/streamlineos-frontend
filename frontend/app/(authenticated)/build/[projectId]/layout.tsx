import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { isApiError } from "@/lib/api-client";
import { serverApiClient } from "@/lib/api/server-client";
import { withPmWorkspacePath } from "@/lib/build/pm-workspace-path";
import type { ProjectWithDetails } from "@/types/projects";
import { AccessDeniedView } from "@/features/build/project-detail/access-denied-view";
import { BackendUnavailableView } from "@/features/build/project-detail/backend-unavailable-view";
import { RememberLastProject } from "@/features/build/sidebar/remember-last-project";

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

  let project: ProjectWithDetails | null = null;
  try {
    project = await serverApiClient.get<ProjectWithDetails>(`/build/${numId}`);
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

  if (project.pmWorkspaceId) {
    const headerList = await headers();
    const pathname = headerList.get("x-pathname") ?? `/build/${projectId}`;
    const search = headerList.get("x-search") ?? "";
    redirect(withPmWorkspacePath(pathname, search, project.pmWorkspaceId));
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <RememberLastProject projectId={projectId} />
      {children}
    </div>
  );
}
