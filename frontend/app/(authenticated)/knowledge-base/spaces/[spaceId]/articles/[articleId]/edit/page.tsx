"use client";

import { useParams } from "next/navigation";
import { ArticleEditor, ArticleEditorSkeleton } from "@/components/kb/article-editor";
import { ErrorState } from "@/components/shared";
import { useKbArticle } from "@/hooks/api/kb";
import { getErrorMessage } from "@/lib/get-error-message";

export default function EditKbArticlePage() {
  const params = useParams<{ spaceId: string; articleId: string }>();
  const spaceId = Number(params.spaceId);
  const articleId = Number(params.articleId);

  const articleQuery = useKbArticle(articleId);

  function handleRetry() {
    void articleQuery.refetch();
  }

  if (articleQuery.isLoading) {
    return <ArticleEditorSkeleton />;
  }

  if (articleQuery.error || !articleQuery.data) {
    return (
      <div className="flex flex-1 min-h-0 items-center justify-center p-6">
        <ErrorState
          title="Couldn't load article"
          description={
            articleQuery.error
              ? getErrorMessage(articleQuery.error)
              : "This article does not exist."
          }
          onRetry={handleRetry}
        />
      </div>
    );
  }

  return (
    <ArticleEditor
      key={articleQuery.data.id}
      spaceId={spaceId}
      article={articleQuery.data}
    />
  );
}
