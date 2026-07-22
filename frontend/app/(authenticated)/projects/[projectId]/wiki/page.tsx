import { requireSession } from "@/lib/rbac/require-permission";
import { RequireModule } from "@/components/auth/require-module";
import WikiHomePage from "@/features/knowledge-base/components/wiki-home-page";

interface ProjectWikiPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectWikiPage({ params }: ProjectWikiPageProps) {
  await requireSession();
  const { projectId } = await params;
  const parsedProjectId = Number(projectId);
  return (
    <RequireModule module="kb">
      <WikiHomePage projectId={Number.isFinite(parsedProjectId) && parsedProjectId > 0 ? parsedProjectId : undefined} />
    </RequireModule>
  );
}
