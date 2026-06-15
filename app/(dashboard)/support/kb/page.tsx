"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingState } from "@/components/shared/loading-state";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import {
  BookOpen,
  Plus,
  FolderTree,
  FileText,
  Globe,
  Eye,
  Pencil,
  Trash2,
  CheckCircle2,
} from "lucide-react";
import {
  useKbCategories,
  useCreateKbCategory,
  useUpdateKbCategory,
  useDeleteKbCategory,
  useKbArticles,
  useCreateKbArticle,
  useDeleteKbArticle,
  type KbCategory,
  type KbArticleListItem,
  type KbArticleStatus,
  type KbArticleVisibility,
} from "@/lib/api/hooks/support/kb";
import { getApiError } from "@/lib/api-client";
import { toast } from "sonner";
import { format } from "date-fns";

const STATUS_VARIANT: Record<KbArticleStatus, "secondary" | "default" | "outline"> = {
  draft: "secondary",
  published: "default",
  archived: "outline",
};

const STATUS_LABEL: Record<KbArticleStatus, string> = {
  draft: "Draft",
  published: "Published",
  archived: "Archived",
};

const VISIBILITY_LABEL: Record<KbArticleVisibility, string> = {
  public: "Public",
  internal: "Internal",
};

const STATUS_ALL = "all";
const VISIBILITY_ALL = "all";
const CATEGORY_ALL = "all";

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BookOpen;
  label: string;
  value: number;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-4">
        <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
          <Icon className="h-4.5 w-4.5 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <p className="text-xl font-semibold tabular-nums leading-none">{value}</p>
          <p className="text-xs text-muted-foreground mt-1 truncate">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function CategoryDialog({
  category,
  onClose,
}: {
  category?: KbCategory;
  onClose: () => void;
}) {
  const isEdit = !!category;
  const [name, setName] = useState(category?.name ?? "");
  const [description, setDescription] = useState(category?.description ?? "");
  const [icon, setIcon] = useState(category?.icon ?? "");
  const [isPublished, setIsPublished] = useState(category?.isPublished ?? false);

  const create = useCreateKbCategory();
  const update = useUpdateKbCategory();
  const isPending = create.isPending || update.isPending;

  function handleSave() {
    if (!name.trim()) return;
    const payload = {
      name: name.trim(),
      description: description.trim() || undefined,
      icon: icon.trim() || undefined,
      isPublished,
    };
    if (isEdit) {
      update.mutate(
        { id: category.id, ...payload, description: description.trim() || null, icon: icon.trim() || null },
        {
          onSuccess: () => {
            toast.success("Category updated");
            onClose();
          },
          onError: (e) => toast.error(getApiError(e)),
        },
      );
    } else {
      create.mutate(payload, {
        onSuccess: () => {
          toast.success("Category created");
          onClose();
        },
        onError: (e) => toast.error(getApiError(e)),
      });
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Category" : "New Category"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Name *</Label>
            <Input
              placeholder="e.g. Getting Started"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Description</Label>
            <Textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Icon name</Label>
            <Input
              placeholder="Optional lucide icon name"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
            <div>
              <p className="text-sm font-medium">Published to help center</p>
              <p className="text-xs text-muted-foreground">Show this category on the public help center</p>
            </div>
            <Switch checked={isPublished} onCheckedChange={setIsPublished} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isPending || !name.trim()}>
            {isPending ? "Saving…" : isEdit ? "Save Changes" : "Create Category"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewArticleDialog({
  categories,
  onClose,
}: {
  categories: KbCategory[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState<string>(CATEGORY_ALL);
  const [visibility, setVisibility] = useState<KbArticleVisibility>("internal");
  const create = useCreateKbArticle();

  function handleCreate() {
    if (!title.trim()) return;
    create.mutate(
      {
        title: title.trim(),
        categoryId: categoryId === CATEGORY_ALL ? null : Number(categoryId),
        visibility,
      },
      {
        onSuccess: (article) => {
          toast.success("Article created");
          onClose();
          router.push(`/support/kb/${article.id}`);
        },
        onError: (e) => toast.error(getApiError(e)),
      },
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Article</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Title *</Label>
            <Input
              placeholder="e.g. How to reset your password"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={CATEGORY_ALL}>Uncategorized</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Visibility</Label>
              <Select
                value={visibility}
                onValueChange={(v) => setVisibility(v as KbArticleVisibility)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="internal">Internal</SelectItem>
                  <SelectItem value="public">Public</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={create.isPending || !title.trim()}>
            {create.isPending ? "Creating…" : "Create & Edit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function KnowledgeBasePage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<string>(STATUS_ALL);
  const [visibilityFilter, setVisibilityFilter] = useState<string>(VISIBILITY_ALL);
  const [categoryFilter, setCategoryFilter] = useState<string>(CATEGORY_ALL);
  const [search, setSearch] = useState("");

  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<KbCategory | null>(null);
  const [deleteCategory, setDeleteCategory] = useState<KbCategory | null>(null);
  const [newArticleOpen, setNewArticleOpen] = useState(false);
  const [deleteArticle, setDeleteArticle] = useState<KbArticleListItem | null>(null);

  const categoriesQuery = useKbCategories();
  const categories = useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data]);

  const articleParams = useMemo(
    () => ({
      status: statusFilter === STATUS_ALL ? undefined : (statusFilter as KbArticleStatus),
      visibility:
        visibilityFilter === VISIBILITY_ALL ? undefined : (visibilityFilter as KbArticleVisibility),
      categoryId: categoryFilter === CATEGORY_ALL ? undefined : Number(categoryFilter),
      search: search.trim() || undefined,
    }),
    [statusFilter, visibilityFilter, categoryFilter, search],
  );

  const articlesQuery = useKbArticles(articleParams);
  const articles = useMemo(() => articlesQuery.data ?? [], [articlesQuery.data]);

  const deleteCategoryMutation = useDeleteKbCategory();
  const deleteArticleMutation = useDeleteKbArticle();

  const categoryNameById = useMemo(() => {
    const map = new Map<number, string>();
    categories.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [categories]);

  const stats = useMemo(() => {
    const total = articles.length;
    const published = articles.filter((a) => a.status === "published").length;
    const publicCount = articles.filter((a) => a.visibility === "public").length;
    return { total, published, publicCount };
  }, [articles]);

  function handleSearchChange(event: ChangeEvent<HTMLInputElement>) {
    setSearch(event.target.value);
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

  return (
    <PageWrapper
      eyebrow="Support"
      title="Knowledge Base"
      subtitle="Author help center articles and organize them into categories."
      actions={
        <>
          <Button variant="outline" size="sm" onClick={() => setCategoryDialogOpen(true)}>
            <FolderTree className="h-4 w-4 mr-1" /> New Category
          </Button>
          <Button size="sm" onClick={() => setNewArticleOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> New Article
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <StatCard icon={FileText} label="Total articles" value={stats.total} />
        <StatCard icon={CheckCircle2} label="Published" value={stats.published} />
        <StatCard icon={Globe} label="Public" value={stats.publicCount} />
      </div>

      <Tabs defaultValue="articles">
        <TabsList>
          <TabsTrigger value="articles">
            <FileText className="h-4 w-4" /> Articles
          </TabsTrigger>
          <TabsTrigger value="categories">
            <FolderTree className="h-4 w-4" /> Categories
          </TabsTrigger>
        </TabsList>

        <TabsContent value="articles" className="mt-4 space-y-4">
          <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
            <Input
              placeholder="Search title or excerpt…"
              value={search}
              onChange={handleSearchChange}
              className="lg:max-w-xs"
            />
            <div className="flex flex-wrap gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[calc(50%-0.25rem)] sm:w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={STATUS_ALL}>All statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
              <Select value={visibilityFilter} onValueChange={setVisibilityFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Visibility" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={VISIBILITY_ALL}>All visibility</SelectItem>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="internal">Internal</SelectItem>
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[160px]">
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
          </div>

          {articlesQuery.isLoading ? (
            <LoadingState variant="list" />
          ) : articlesQuery.error ? (
            <ErrorState
              description={getApiError(articlesQuery.error)}
              onRetry={() => articlesQuery.refetch()}
            />
          ) : articles.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No articles found"
              description="Create your first help center article to get started."
              action={{ label: "New Article", onClick: () => setNewArticleOpen(true) }}
              className="min-h-[40vh]"
            />
          ) : (
            <div className="space-y-2">
              {articles.map((article) => (
                <Card key={article.id} className="hover:border-primary/40 transition-colors">
                  <CardContent className="py-3">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <button
                          type="button"
                          onClick={() => router.push(`/support/kb/${article.id}`)}
                          className="text-left font-medium text-sm hover:underline truncate block w-full"
                        >
                          {article.title}
                        </button>
                        {article.excerpt && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                            {article.excerpt}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <Badge variant={STATUS_VARIANT[article.status]} className="text-[10px]">
                            {STATUS_LABEL[article.status]}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            {VISIBILITY_LABEL[article.visibility]}
                          </Badge>
                          {article.categoryId && categoryNameById.has(article.categoryId) && (
                            <span className="text-[11px] text-muted-foreground">
                              {categoryNameById.get(article.categoryId)}
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Eye className="h-3 w-3" /> {article.views}
                          </span>
                          {article.updatedAt && (
                            <span className="text-[11px] text-muted-foreground">
                              {format(new Date(article.updatedAt), "MMM d, yyyy")}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => router.push(`/support/kb/${article.id}`)}
                          aria-label="Edit article"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => setDeleteArticle(article)}
                          aria-label="Delete article"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
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
              onRetry={() => categoriesQuery.refetch()}
            />
          ) : categories.length === 0 ? (
            <EmptyState
              icon={FolderTree}
              title="No categories yet"
              description="Group your articles into categories for the help center."
              action={{ label: "New Category", onClick: () => setCategoryDialogOpen(true) }}
              className="min-h-[40vh]"
            />
          ) : (
            <div className="space-y-2">
              {categories.map((category) => (
                <Card key={category.id}>
                  <CardContent className="py-3 flex items-start gap-3">
                    <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <FolderTree className="h-4.5 w-4.5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{category.name}</p>
                        {category.isPublished ? (
                          <Badge variant="default" className="text-[10px]">
                            Published
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">
                            Hidden
                          </Badge>
                        )}
                      </div>
                      {category.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {category.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => setEditCategory(category)}
                        aria-label="Edit category"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setDeleteCategory(category)}
                        aria-label="Delete category"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {categoryDialogOpen && (
        <CategoryDialog onClose={() => setCategoryDialogOpen(false)} />
      )}
      {editCategory && (
        <CategoryDialog category={editCategory} onClose={() => setEditCategory(null)} />
      )}
      {newArticleOpen && (
        <NewArticleDialog categories={categories} onClose={() => setNewArticleOpen(false)} />
      )}

      <AlertDialog
        open={!!deleteCategory}
        onOpenChange={(open) => !open && setDeleteCategory(null)}
      >
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

      <AlertDialog
        open={!!deleteArticle}
        onOpenChange={(open) => !open && setDeleteArticle(null)}
      >
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
