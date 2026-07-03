"use client";

import { useMemo } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { useKbArticle, useKbCategories } from "@/hooks/api/support/kb";
import { getApiError } from "@/lib/api-client";
import { KbArticleEditor } from "./kb-article-editor";

export function KbArticleEditorPage({ articleId }: { articleId: number }) {
  const articleQuery = useKbArticle(articleId);
  const categoriesQuery = useKbCategories();
  const categories = useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data]);

  function handleRetry() {
    void articleQuery.refetch();
  }

  if (articleQuery.isLoading) {
    return (
      <PageWrapper eyebrow="Documents · Knowledge Base" title="Edit Article">
        <LoadingState variant="form" />
      </PageWrapper>
    );
  }

  if (articleQuery.error || !articleQuery.data) {
    return (
      <PageWrapper eyebrow="Documents · Knowledge Base" title="Edit Article">
        <ErrorState
          title="Article not found"
          description={
            articleQuery.error
              ? getApiError(articleQuery.error)
              : "This article does not exist."
          }
          onRetry={handleRetry}
        />
      </PageWrapper>
    );
  }

  return (
    <KbArticleEditor
      key={articleQuery.data.id}
      article={articleQuery.data}
      categories={categories}
    />
  );
}
