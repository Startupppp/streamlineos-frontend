import { KbArticleEditorPage } from "@/features/kb/components/kb-article-editor-page";

export default async function SupportKbArticlePage({
  params,
}: {
  params: Promise<{ articleId: string }>;
}) {
  const { articleId } = await params;
  return <KbArticleEditorPage articleId={Number(articleId)} />;
}
