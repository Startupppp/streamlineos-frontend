"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  CheckCircle2,
  FileText,
  FolderTree,
  Globe,
  Loader2,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";
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
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { LoadingState } from "@/components/shared/loading-state";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import {
  EmptyPublicDocsIllustration,
  EmptyDocumentsIllustration,
} from "@/components/illustrations";
import { KbArticleCard } from "@/features/support/components/kb-article-card";
import { KbCategoryListItem } from "@/features/support/components/kb-category-list-item";
import { KbCategoryDialog } from "@/features/support/components/kb-category-dialog";
import { KbNewArticleDialog } from "@/features/support/components/kb-new-article-dialog";
import {
  useKbCategories,
  useDeleteKbCategory,
  useKbArticles,
  useDeleteKbArticle,
  type KbCategory,
  type KbArticleListItem,
  type KbArticleStatus,
  type KbArticleVisibility,
} from "@/hooks/api/support/kb";
import { KbAskPanel } from "@/components/support/kb-ask-panel";
import { useReindexAllKb } from "@/hooks/api/support/kb-rag";
import { getApiError } from "@/lib/api-client";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { toast } from "sonner";

function isKbArticleStatus(v: string): v is KbArticleStatus {
  return v === "draft" || v === "published" || v === "archived";
}

function isKbArticleVisibility(v: string): v is KbArticleVisibility {
  return v === "public" || v === "internal";
}

const STATUS_ALL = "all";
const VISIBILITY_ALL = "all";
const CATEGORY_ALL = "all";

export default function KnowledgeBasePage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeTab = searchParams.get("tab") ?? "articles";
  const statusFilter = searchParams.get("status") ?? STATUS_ALL;
  const visibilityFilter = searchParams.get("visibility") ?? VISIBILITY_ALL;
  const categoryFilter = searchParams.get("category") ?? CATEGORY_ALL;

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);

  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<KbCategory | null>(null);
  const [deleteCategory, setDeleteCategory] = useState<KbCategory | null>(null);
  const [newArticleOpen, setNewArticleOpen] = useState(false);
  const [deleteArticle, setDeleteArticle] = useState<KbArticleListItem | null>(null);

  const categoriesQuery = useKbCategories();
  const categories = useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data]);

  const articleParams = useMemo(
    () => ({
      status: isKbArticleStatus(statusFilter) ? statusFilter : undefined,
      visibility: isKbArticleVisibility(visibilityFilter) ? visibilityFilter : undefined,
      categoryId: categoryFilter !== CATEGORY_ALL ? Number(categoryFilter) : undefined,
      search: debouncedSearch || undefined,
    }),
    [statusFilter, visibilityFilter, categoryFilter, debouncedSearch],
  );

  const articlesQuery = useKbArticles(articleParams);
  const articles = useMemo(() => articlesQuery.data ?? [], [articlesQuery.data]);

  const deleteCategoryMutation = useDeleteKbCategory();
  const deleteArticleMutation = useDeleteKbArticle();
  const reindexAll = useReindexAllKb();

  const categoryNameById = useMemo(() => {
    const map = new Map<number, string>();
    categories.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [categories]);

  const stats = useMemo(() => {
    const published = articles.filter((a) => a.status === "published").length;
    const publicCount = articles.filter((a) => a.visibility === "public").length;
    return { total: articles.length, published, publicCount };
  }, [articles]);

  function setUrlParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value) params.delete(key);
    else params.set(key, value);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function handleTabChange(tab: string) {
    setUrlParam("tab", tab !== "articles" ? tab : null);
  }

  function handleStatusChange(v: string) {
    setUrlParam("status", v !== STATUS_ALL ? v : null);
  }

  function handleVisibilityChange(v: string) {
    setUrlParam("visibility", v !== VISIBILITY_ALL ? v : null);
  }

  function handleCategoryFilterChange(v: string) {
    setUrlParam("category", v !== CATEGORY_ALL ? v : null);
  }

  function handleSearchChange(event: ChangeEvent<HTMLInputElement>) {
    setSearch(event.target.value);
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

  function handleOpenCategoryDialog() {
    setCategoryDialogOpen(true);
  }

  function handleCloseCategoryDialog() {
    setCategoryDialogOpen(false);
  }

  function handleCloseEditCategory() {
    setEditCategory(null);
  }

  function handleOpenNewArticle() {
    setNewArticleOpen(true);
  }

  function handleCloseNewArticle() {
    setNewArticleOpen(false);
  }

  function handleDeleteCategoryOpenChange(open: boolean) {
    if (!open) setDeleteCategory(null);
  }

  function handleDeleteArticleOpenChange(open: boolean) {
    if (!open) setDeleteArticle(null);
  }

  function handleNavigateToArticle(id: number) {
    router.push(`/support/kb/${id}`);
  }

  function handleDeleteArticle(article: KbArticleListItem) {
    setDeleteArticle(article);
  }

  function handleEditCategoryItem(category: KbCategory) {
    setEditCategory(category);
  }

  function handleDeleteCategoryItem(category: KbCategory) {
    setDeleteCategory(category);
  }

  function handleArticlesRetry() {
    void articlesQuery.refetch();
  }

  function handleCategoriesRetry() {
    void categoriesQuery.refetch();
  }

  const filtersBar = (
    <div className="flex w-full min-w-0 flex-nowrap items-center gap-2">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search articles…"
          value={search}
          onChange={handleSearchChange}
          className="h-8 text-xs pl-8"
        />
      </div>
      <Select value={statusFilter} onValueChange={handleStatusChange}>
        <SelectTrigger className="h-8 text-xs hidden sm:flex w-[130px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={STATUS_ALL}>All statuses</SelectItem>
          <SelectItem value="draft">Draft</SelectItem>
          <SelectItem value="published">Published</SelectItem>
          <SelectItem value="archived">Archived</SelectItem>
        </SelectContent>
      </Select>
      <Select value={visibilityFilter} onValueChange={handleVisibilityChange}>
        <SelectTrigger className="h-8 text-xs hidden sm:flex w-[130px]">
          <SelectValue placeholder="Visibility" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={VISIBILITY_ALL}>All visibility</SelectItem>
          <SelectItem value="public">Public</SelectItem>
          <SelectItem value="internal">Internal</SelectItem>
        </SelectContent>
      </Select>
      <Select value={categoryFilter} onValueChange={handleCategoryFilterChange}>
        <SelectTrigger className="h-8 text-xs hidden sm:flex w-[140px]">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={CATEGORY_ALL}>All categories</SelectItem>
          {categories.map((c) => (
            <SelectItem key={c.id} value={String(c.id)}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <PageWrapper
      eyebrow="Support"
      title="Knowledge Base"
      subtitle={`${stats.total} article${stats.total !== 1 ? "s" : ""} · ${categories.length} categor${categories.length !== 1 ? "ies" : "y"}`}
      filters={activeTab === "articles" ? filtersBar : undefined}
      actions={
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={handleReindexAll}
            disabled={reindexAll.isPending}
          >
            {reindexAll.isPending ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-1" />
            )}
            {reindexAll.isPending ? "Indexing…" : "Index all for AI"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleOpenCategoryDialog}>
            <FolderTree className="h-4 w-4 mr-1" /> New Category
          </Button>
          <Button size="sm" onClick={handleOpenNewArticle}>
            <Plus className="h-4 w-4 mr-1" /> New Article
          </Button>
        </>
      }
    >
      <StatCardGrid cols={3} className="mb-5">
        <StatCard icon={FileText} label="Total articles" value={stats.total} />
        <StatCard
          icon={CheckCircle2}
          label="Published"
          value={stats.published}
          tone="emerald"
        />
        <StatCard icon={Globe} label="Public" value={stats.publicCount} tone="blue" />
      </StatCardGrid>

      <KbAskPanel mode="authed" className="mb-5" />

      <Tabs value={activeTab} onValueChange={handleTabChange}>
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
          ) : articles.length === 0 ? (
            <EmptyState
              illustration={<EmptyPublicDocsIllustration />}
              title="No articles found"
              description="Create your first help center article to get started."
              action={{ label: "New Article", onClick: handleOpenNewArticle }}
              className="min-h-[40vh]"
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
                  onDelete={handleDeleteArticle}
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
              className="min-h-[40vh]"
            />
          ) : (
            <div className="space-y-2">
              {categories.map((category) => (
                <KbCategoryListItem
                  key={category.id}
                  category={category}
                  onEdit={handleEditCategoryItem}
                  onDelete={handleDeleteCategoryItem}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {categoryDialogOpen && <KbCategoryDialog onClose={handleCloseCategoryDialog} />}
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
