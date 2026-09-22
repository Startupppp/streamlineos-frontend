import { notFound } from "next/navigation";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { RequireModule } from "@/components/auth/require-module";
import ProjectWikiPageDocument from "@/features/wiki/components/project-wiki-page-document";

interface ProjectWikiDocPageProps {
  params: Promise<{ projectId: string; pageId: string }>;
}

export default async function ProjectWikiDocPage({ params }: ProjectWikiDocPageProps) {
  await enforceRouteAccess("/build/[projectId]/wiki/[pageId]");
  const { projectId: rawProjectId, pageId: rawPageId } = await params;
  const projectId = parseInt(rawProjectId, 10);
  const pageId = parseInt(rawPageId, 10);
  if (!Number.isFinite(projectId) || projectId <= 0 || !Number.isFinite(pageId) || pageId <= 0) {
    notFound();
  }
  return (
    <RequireModule module="kb">
      <ProjectWikiPageDocument projectId={projectId} pageId={pageId} />
    </RequireModule>
  );
}
