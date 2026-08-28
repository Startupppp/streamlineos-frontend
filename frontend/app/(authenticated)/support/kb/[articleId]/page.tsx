import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { KbArticleEditorPage } from "@/features/help-centre/components/kb-article-editor-page";

export default async function SupportKbArticlePage({
  params,
}: {
  params: Promise<{ articleId: string }>;
}) {
  await enforceRouteAccess("/support/kb/[articleId]");
  const { articleId } = await params;
  return <KbArticleEditorPage articleId={Number(articleId)} />;
}
