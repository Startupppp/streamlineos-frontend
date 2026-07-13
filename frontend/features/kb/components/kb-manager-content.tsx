"use client";

import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import {
  EmptyDocumentsIllustration,
  EmptyKnowledgeIllustration,
  EmptySearchIllustration,
} from "@/components/illustrations";
import { CheckCircle2, FileText, FolderTree, Globe, Loader2, Plus, Sparkles } from "lucide-react";
import { KbArticleCard } from "./kb-article-card";
import { KbCategoryListItem } from "./kb-category-list-item";
import { KbCategoryDialog } from "./kb-category-dialog";
import { KbNewArticleDialog } from "./kb-new-article-dialog";
import { KbAskPanel } from "@/components/support/kb-ask-panel";
import {
  useKbArticles,
  useKbCategories,
  useDeleteKbArticle,
  useDeleteKbCategory,
  type KbArticleListItem,
  type KbArticleStatus,
  type KbArticleVisibility,
  type KbCategory,
} from "@/hooks/api/support/kb";
import { useReindexAllKb } from "@/hooks/api/support/kb-rag";
import { useAccess } from "@/hooks/api/access";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { getApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const filterControlClassName = "h-9 text-xs";

function isStatus(v: string): v is KbArticleStatus {
  return v === "draft" || v === "published" || v === "archived";
}

function isVisibility(v: string): v is KbArticleVisibility {
  return v === "public" || v === "internal";
}

export function KbManagerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tab = searchParams.get("tab") ?? "articles";
  const statusParam = searchParams.get("status") ?? "all";
  const visibilityParam = searchParams.get("visibility") ?? "all";
  const categoryParam = searchParams.get("category") ?? "all";

  const [localSearch, setLocalSearch] = useState(() => searchParams.get("q") ?? "");
  const debouncedSearch = useDebouncedValue(localSearch, 400);

  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<KbCategory | null>(null);
  const [deleteCategory, setDeleteCategory] = useState<KbCategory | null>(null);
  const [newArticleOpen, setNewArticleOpen] = useState(
    () => searchParams.get("create") === "1",
  );
  const [deleteArticle, setDeleteArticle] = useState<KbArticleListItem | null>(null);

  const { data: access } = useAccess();
  const supportEnabled = Boolean(
    access?.isOrgOwner || access?.isPlatformAdmin || access?.modules?.support,
  );

  const categoriesQuery = useKbCategories({ enabled: supportEnabled });
  const categories = useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data]);

  const articleParams = useMemo(
    () => ({
      status: isStatus(statusParam) ? statusParam : undefined,
      visibility: isVisibility(visibilityParam) ? visibilityParam : undefined,
      categoryId: categoryParam !== "all" ? Number(categoryParam) : undefined,
      search: debouncedSearch.trim() || undefined,
    }),
    [statusParam, visibilityParam, categoryParam, debouncedSearch],
  );

  const articlesQuery = useKbArticles(articleParams, { enabled: supportEnabled });
  const articles = useMemo(() => articlesQuery.data ?? [], [articlesQuery.data]);

  const deleteCategoryMutation = useDeleteKbCategory();
  const deleteArticleMutation = useDeleteKbArticle();
  const reindexAll = useReindexAllKb();

  const hasFilters =
    statusParam !== "all" ||
    visibilityParam !== "all" ||
    categoryParam !== "all" ||
    debouncedSearch.trim() !== "";

  const categoryNameById = useMemo(() => {
    const map = new Map<number, string>();
    categories.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [categories]);

  const stats = useMemo(
    () => ({
      total: articles.length,
      published: articles.filter((a) => a.status === "published").length,
      publicCount: articles.filter((a) => a.visibility === "public").length,
    }),
    [articles],
  );

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (value === "all" || value === "") next.delete(key);
    else next.set(key, value);
    router.replace(`?${next.toString()}`);
  }

  const syncSearchToUrl = useCallback(() => {
    const currentQ = searchParams.get("q") ?? "";
    if (debouncedSearch === currentQ) return;
    const next = new URLSearchParams(searchParams.toString());
    if (debouncedSearch) next.set("q", debouncedSearch);
    else next.delete("q");
    router.replace(`?${next.toString()}`);
  }, [debouncedSearch, searchParams, router]);

  useEffect(() => {
    syncSearchToUrl();
  }, [syncSearchToUrl]);

  function handleTabChange(value: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (value === "articles") next.delete("tab");
    else next.set("tab", value);
    router.replace(`?${next.toString()}`);
  }

  function handleSearchChange(event: ChangeEvent<HTMLInputElement>) {
    setLocalSearch(event.target.value);
  }

  function handleStatusChange(v: string) {
    setParam("status", v);
  }

  function handleVisibilityChange(v: string) {
    setParam("visibility", v);
  }

  function handleCategoryChange(v: string) {
    setParam("category", v);
  }

  function handleClearFilters() {
    setLocalSearch("");
    router.replace("?");
  }

  function handleReindexAll() {
    reindexAll.mutate(undefined, {
      onSuccess: (result) => {
        toast.success(
          `Indexed ${result.indexed}/${result.total} articles · ${result.totalChunks} passages`,
        );
        if (result.failures.length > 0) {
          toast.warning(`${result.failures.length} article(s) failed to index`);
        }
      },
      onError: (e) => toast.error(getApiError(e)),
    });
  }

  function handleConfirmDeleteCategory() {
    if (!deleteCategory) return;
    deleteCategoryMutation.mutate(deleteCategory.id, {
      onSuccess: () => {
        toast.success("Category deleted");
        setDeleteCategory(null);
      },
      onError: (e) => toast.error(getApiError(e)),
    });
  }

  function handleConfirmDeleteArticle() {
    if (!deleteArticle) return;
    deleteArticleMutation.mutate(deleteArticle.id, {
      onSuccess: () => {
        toast.success("Article deleted");
        setDeleteArticle(null);
      },
      onError: (e) => toast.error(getApiError(e)),
    });
  }

  function handleNavigateToArticle(id: number) {
    router.push(`/support/kb/${id}`);
  }

  function handleOpenNewArticle() {
    setNewArticleOpen(true);
  }

  function handleOpenCategoryDialog() {
    setCategoryDialogOpen(true);
  }

  function handleCloseCategoryDialog() {
    setCategoryDialogOpen(false);
  }

  function handleCloseEditCategory() {
    setEditCategory(null);
  }

  function handleCloseNewArticle() {
    setNewArticleOpen(false);
    if (searchParams.get("create")) {
      const next = new URLSearchParams(searchParams.toString());
      next.delete("create");
      router.replace(`?${next.toString()}`);
    }
  }

  function handleDeleteCategoryOpenChange(open: boolean) {
    if (!open) setDeleteCategory(null);
  }

  function handleDeleteArticleOpenChange(open: boolean) {
    if (!open) setDeleteArticle(null);
  }

  function handleArticlesRetry() {
    void articlesQuery.refetch();
  }

  function handleCategoriesRetry() {
    void categoriesQuery.refetch();
  }

  const filters = (
    <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <Input
        placeholder="Search…"
        value={localSearch}
        onChange={handleSearchChange}
        className={cn(filterControlClassName, "w-full sm:max-w-[200px]")}
      />
      <div className="grid w-full grid-cols-3 gap-2 sm:contents">
        <Select value={statusParam} onValueChange={handleStatusChange}>
          <SelectTrigger className={cn(filterControlClassName, "w-full sm:w-[130px]")}>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        <Select value={visibilityParam} onValueChange={handleVisibilityChange}>
          <SelectTrigger className={cn(filterControlClassName, "w-full sm:w-[130px]")}>
            <SelectValue placeholder="Visibility" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All visibility</SelectItem>
            <SelectItem value="public">Public</SelectItem>
            <SelectItem value="internal">Internal</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryParam} onValueChange={handleCategoryChange}>
          <SelectTrigger className={cn(filterControlClassName, "w-full sm:w-[150px]")}>
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <PageWrapper
      eyebrow="Documents"
      title="Knowledge Base"
      subtitle={
        stats.total === 0
          ? "Create and publish help articles for customers and your team"
          : "Manage help articles, categories, and AI-indexed content for your team"
      }
      mobileFiltersInline
      filters={filters}
      actions={
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={handleReindexAll}
            disabled={reindexAll.isPending}
          >
            {reindexAll.isPending ? (
              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5 mr-1" />
            )}
            {reindexAll.isPending ? "Indexing…" : "Index all for AI"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleOpenCategoryDialog}>
            <FolderTree className="h-3.5 w-3.5 mr-1" /> New Category
          </Button>
          <Button size="sm" onClick={handleOpenNewArticle}>
            <Plus className="h-3.5 w-3.5 mr-1" /> New Article
          </Button>
        </>
      }
    >
      <StatCardGrid cols={3} className="mb-5">
        <StatCard label="Total articles" value={stats.total} icon={FileText} />
        <StatCard label="Published" value={stats.published} icon={CheckCircle2} tone="emerald" />
        <StatCard label="Public" value={stats.publicCount} icon={Globe} tone="blue" />
      </StatCardGrid>

      <KbAskPanel mode="authed" className="mb-5" />

      <Tabs value={tab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="articles">
            <FileText className="h-4 w-4 mr-1.5" /> Articles
          </TabsTrigger>
          <TabsTrigger value="categories">
            <FolderTree className="h-4 w-4 mr-1.5" /> Categories
          </TabsTrigger>
        </TabsList>

        <TabsContent value="articles" className="mt-4">
          {articlesQuery.isLoading ? (
            <LoadingState variant="list" />
          ) : articlesQuery.error ? (
            <ErrorState
              description={getApiError(articlesQuery.error)}
              onRetry={handleArticlesRetry}
            />
          ) : articles.length === 0 && hasFilters ? (
            <EmptyState
              illustration={<EmptySearchIllustration />}
              title="No articles match your filters"
              description="Try adjusting your search or filters."
              action={{ label: "Clear filters", onClick: handleClearFilters }}
            />
          ) : articles.length === 0 ? (
            <EmptyState
              illustration={<EmptyKnowledgeIllustration />}
              title="No articles yet"
              description="Create your first help center article to get started."
              action={{ label: "New Article", onClick: handleOpenNewArticle }}
            />
          ) : (
            <div className="space-y-2">
              {articles.map((article) => (
                <KbArticleCard
                  key={article.id}
                  article={article}
                  categoryName={
                    article.categoryId ? categoryNameById.get(article.categoryId) : undefined
                  }
                  onNavigate={handleNavigateToArticle}
                  onDelete={setDeleteArticle}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="categories" className="mt-4">
          {categoriesQuery.isLoading ? (
            <LoadingState variant="list" />
          ) : categoriesQuery.error ? (
            <ErrorState
              description={getApiError(categoriesQuery.error)}
              onRetry={handleCategoriesRetry}
            />
          ) : categories.length === 0 ? (
            <EmptyState
              illustration={<EmptyDocumentsIllustration />}
              title="No categories yet"
              description="Group your articles into categories for the help center."
              action={{ label: "New Category", onClick: handleOpenCategoryDialog }}
            />
          ) : (
            <div className="space-y-2">
              {categories.map((category) => (
                <KbCategoryListItem
                  key={category.id}
                  category={category}
                  onEdit={setEditCategory}
                  onDelete={setDeleteCategory}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {categoryDialogOpen && (
        <KbCategoryDialog onClose={handleCloseCategoryDialog} />
      )}
      {editCategory && (
        <KbCategoryDialog category={editCategory} onClose={handleCloseEditCategory} />
      )}
      {newArticleOpen && (
        <KbNewArticleDialog categories={categories} onClose={handleCloseNewArticle} />
      )}

      <AlertDialog open={!!deleteCategory} onOpenChange={handleDeleteCategoryOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete category?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteCategory?.name}&rdquo; will be deleted. Articles in this category will
              become uncategorized.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleConfirmDeleteCategory}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteArticle} onOpenChange={handleDeleteArticleOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete article?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteArticle?.title}&rdquo; will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleConfirmDeleteArticle}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}
