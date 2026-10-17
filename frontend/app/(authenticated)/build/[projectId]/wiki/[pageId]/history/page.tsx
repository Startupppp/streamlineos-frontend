import { notFound } from "next/navigation";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { RequireModule } from "@/components/auth/require-module";
import PageHistoryPage from "@/features/wiki/components/page-history-page";

interface ProjectWikiHistoryPageProps {
  params: Promise<{ projectId: string; pageId: string }>;
  searchParams?: Promise<{ version?: string; compare?: string }>;
}

export default async function ProjectWikiHistoryPage({
  params,
  searchParams,
}: ProjectWikiHistoryPageProps) {
  await enforceRouteAccess("/build/[projectId]/wiki/[pageId]/history");
  const { projectId: rawProjectId, pageId: rawPageId } = await params;
  const projectId = parseInt(rawProjectId, 10);
  const pageId = parseInt(rawPageId, 10);
  if (
    !Number.isFinite(projectId) ||
    projectId <= 0 ||
    !Number.isFinite(pageId) ||
    pageId <= 0
  ) {
    notFound();
  }
  const sp = searchParams ? await searchParams : {};
  const rawVersion = sp.version ? parseInt(sp.version, 10) : NaN;
  const rawCompare = sp.compare ? parseInt(sp.compare, 10) : NaN;
  const initialVersion = Number.isFinite(rawVersion) && rawVersion > 0 ? rawVersion : undefined;
  const initialCompare = Number.isFinite(rawCompare) && rawCompare > 0 ? rawCompare : undefined;
  return (
    <RequireModule module="kb">
      <PageHistoryPage
        pageId={pageId}
        projectId={projectId}
        initialVersion={initialVersion}
        initialCompare={initialCompare}
      />
    </RequireModule>
  );
}
