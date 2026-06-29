"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { FolderPlus, Plus, Users } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingState } from "@/components/shared/loading-state";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { CollectionTree } from "@/components/kb/collection-tree";
import { ArticleRow } from "@/components/kb/article-row";
import { CreateCollectionDialog } from "@/components/kb/create-collection-dialog";
import {
  useKbSpace,
  useKbCategories,
  useKbArticles,
} from "@/hooks/api/kb";
import { getApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { KbAudience } from "@/types/kb";

const AUDIENCE_LABEL: Record<KbAudience, string> = {
  internal: "Internal",
  public: "Public",
  mixed: "Mixed",
};

const TREE_SKELETON_WIDTHS = ["w-full", "w-11/12", "w-4/5", "w-full", "w-10/12", "w-3/4"];

function CollectionTreeSkeleton() {
  return (
    <div className="space-y-1.5 p-1">
      {TREE_SKELETON_WIDTHS.map((width, index) => (
        <Skeleton
          key={index}
          className={cn("h-7 rounded-md", index % 2 === 1 && "ml-4", width)}
        />
      ))}
    </div>
  );
}

export default function KnowledgeBaseSpaceDetailPage() {
  const { spaceId: spaceIdParam } = useParams<{ spaceId: string }>();
  const spaceId = Number(spaceIdParam);

  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [createCollectionOpen, setCreateCollectionOpen] = useState(false);

  const spaceQuery = useKbSpace(spaceId);
  const categoriesQuery = useKbCategories(spaceId);
  const categories = useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data]);

  const articlesQuery = useKbArticles({
    spaceId,
    categoryId: selectedCategoryId ?? undefined,
    page,
  });
  const articles = articlesQuery.data;

  const newArticleHref = `/knowledge-base/spaces/${spaceId}/new`;
  const membersHref = `/knowledge-base/spaces/${spaceId}/members`;

  function handleSelectCategory(id: number | null) {
    setSelectedCategoryId(id);
    setPage(1);
  }

  function handleOpenCreateCollection() {
    setCreateCollectionOpen(true);
  }

  function handleRetrySpace() {
    void spaceQuery.refetch();
  }

  function handleRetryCategories() {
    void categoriesQuery.refetch();
  }

  function handleRetryArticles() {
    void articlesQuery.refetch();
  }

  function handlePrevPage() {
    setPage((current) => Math.max(1, current - 1));
  }

  function handleNextPage() {
    setPage((current) => Math.min(articlesQuery.data?.totalPages ?? 1, current + 1));
  }

  if (spaceQuery.isLoading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <LoadingState variant="page" />
      </div>
    );
  }

  if (spaceQuery.isError || !spaceQuery.data) {
    return (
      <div className="flex min-h-0 flex-1 flex-col p-4 sm:p-6">
        <ErrorState
          title="Unable to load space"
          description={
            spaceQuery.error
              ? getApiError(spaceQuery.error)
              : "This knowledge base space could not be found."
          }
          onRetry={handleRetrySpace}
          className="flex-1"
        />
      </div>
    );
  }

  const space = spaceQuery.data;

  return (
    <PageWrapper
      eyebrow="Knowledge Base"
      title={space.name}
      badge={AUDIENCE_LABEL[space.audience]}
      subtitle={space.description ?? undefined}
      noInternalScroll
      actions={
        <>
          <Button asChild variant="outline" size="sm">
            <Link href={membersHref}>
              <Users className="mr-1 h-4 w-4" /> Manage access
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={handleOpenCreateCollection}>
            <FolderPlus className="mr-1 h-4 w-4" /> New collection
          </Button>
          <Button asChild size="sm">
            <Link href={newArticleHref}>
              <Plus className="mr-1 h-4 w-4" /> New article
            </Link>
          </Button>
        </>
      }
    >
      <div className="flex h-full min-h-0 flex-col gap-4 md:flex-row">
        <aside className="flex max-h-44 min-h-0 flex-col md:max-h-none md:w-60 md:shrink-0 md:border-r md:border-border md:pr-3">
          <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin pr-1">
            {categoriesQuery.isLoading ? (
              <CollectionTreeSkeleton />
            ) : categoriesQuery.isError ? (
              <ErrorState
                compact
                title="Couldn't load collections"
                description={getApiError(categoriesQuery.error)}
                onRetry={handleRetryCategories}
              />
            ) : (
              <CollectionTree
                categories={categories}
                selectedId={selectedCategoryId}
                onSelect={handleSelectCategory}
              />
            )}
          </div>
        </aside>

        <section className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
            {articlesQuery.isLoading ? (
              <LoadingState variant="list" />
            ) : articlesQuery.isError ? (
              <ErrorState
                description={getApiError(articlesQuery.error)}
                onRetry={handleRetryArticles}
                className="h-full"
              />
            ) : !articles || articles.items.length === 0 ? (
              <EmptyState
                title="No articles here yet"
                description="Create an article in this space to get started."
                action={{ label: "New article", href: newArticleHref }}
                className="h-full"
              />
            ) : (
              <div className="space-y-2">
                {articles.items.map((article) => (
                  <ArticleRow key={article.id} article={article} spaceId={spaceId} />
                ))}
              </div>
            )}
          </div>

          {articles && articles.totalPages > 1 && (
            <div className="mt-3 flex shrink-0 items-center justify-between border-t border-border pt-3">
              <p className="text-xs text-muted-foreground">
                Page {articles.page} of {articles.totalPages} · {articles.total} articles
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevPage}
                  disabled={articles.page <= 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={articles.page >= articles.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>

      <CreateCollectionDialog
        spaceId={spaceId}
        categories={categories}
        open={createCollectionOpen}
        onOpenChange={setCreateCollectionOpen}
      />
    </PageWrapper>
  );
}
