"use client";

import { useMemo } from "react";
import { notFound } from "next/navigation";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { useKbArticle, useKbCategories } from "@/hooks/api/support/kb";
import { getApiError, isApiError } from "@/lib/api-client";
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
      <PageWrapper title="Edit Article">
        <LoadingState variant="form" />
      </PageWrapper>
    );
  }

  if (articleQuery.error) {
    if (isApiError(articleQuery.error) && articleQuery.error.status === 404) {
      notFound();
    }
    return (
      <PageWrapper title="Edit Article">
        <ErrorState
          title="Failed to load article"
          description={getApiError(articleQuery.error)}
          onRetry={handleRetry}
        />
      </PageWrapper>
    );
  }

  if (!articleQuery.data) {
    notFound();
  }

  const article = articleQuery.data;

  return (
    <KbArticleEditor
      key={article.id}
      article={article}
      categories={categories}
    />
  );
}
