"use client";

import { useMemo } from "react";
import Link from "next/link";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { NoPermissionState } from "@/components/shared/no-permission-state";
import { useSupportKbArticle, useSupportKbCategories } from "@/hooks/api/support/kb";
import { isApiError } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/get-error-message";
import { KbArticleEditor } from "./kb-article-editor";

export function KbArticleEditorPage({ articleId }: { articleId: number }) {
  const articleQuery = useSupportKbArticle(articleId);
  const categoriesQuery = useSupportKbCategories();
  const categories = useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data]);

  function handleRetry() {
    void articleQuery.refetch();
  }

  const missing =
    (isApiError(articleQuery.error) && articleQuery.error.status === 404) ||
    (!articleQuery.access.pending &&
      !articleQuery.isLoading &&
      !articleQuery.isFetching &&
      !articleQuery.error &&
      !articleQuery.data);

  if (articleQuery.access.pending || articleQuery.isLoading) {
    return (
      <PageWrapper title="Edit Article">
        <LoadingState variant="form" />
      </PageWrapper>
    );
  }

  if (articleQuery.access.denied) {
    return (
      <PageWrapper title="Edit Article" backHref="/support/kb">
        <NoPermissionState permission={articleQuery.access.permission} />
      </PageWrapper>
    );
  }

  if (missing) {
    return (
      <PageWrapper title="Article not found" backHref="/support/kb">
        <ErrorState
          title="Article not found"
          description="This article was deleted or the link is no longer valid."
          onRetry={undefined}
        />
        <Link href="/support/kb" className="text-sm text-primary underline">
          Back to Knowledge Base
        </Link>
      </PageWrapper>
    );
  }

  if (articleQuery.error || !articleQuery.data) {
    return (
      <PageWrapper title="Edit Article">
        <ErrorState
          title="Failed to load article"
          description={getErrorMessage(articleQuery.error)}
          error={articleQuery.error}
          onRetry={handleRetry}
        />
      </PageWrapper>
    );
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
