import { notFound } from "next/navigation";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { RequireModule } from "@/components/auth/require-module";
import PageHistoryPage from "@/features/wiki/components/page-history-page";

interface ProjectWikiPageHistoryProps {
  params: Promise<{ projectId: string; pageId: string }>;
}

export default async function ProjectWikiPageHistoryRoute({
  params,
}: ProjectWikiPageHistoryProps) {
  await enforceRouteAccess("/build/[projectId]/wiki/[pageId]");
  const { pageId: rawPageId } = await params;
  const pageId = parseInt(rawPageId, 10);

  if (!Number.isFinite(pageId) || pageId <= 0) notFound();

  return (
    <RequireModule module="kb">
      <PageHistoryPage pageId={pageId} />
    </RequireModule>
  );
}
