import { notFound } from "next/navigation";
import { requireSession } from "@/lib/rbac/require-permission";
import { RequireModule } from "@/components/auth/require-module";
import ProjectWikiPageDocument from "@/features/knowledge-base/components/project-wiki-page-document";

interface ProjectWikiDocPageProps {
  params: Promise<{ projectId: string; pageId: string }>;
}

export default async function ProjectWikiDocPage({ params }: ProjectWikiDocPageProps) {
  await requireSession();
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
