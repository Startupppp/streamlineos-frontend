"use client";

import { useState, useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { FileText, Trash2 } from "lucide-react";
import { PlusIcon } from "@animateicons/react/lucide";
import { useCan } from "@/hooks/api/access";
import {
  useAdminBlogPost,
  useAdminBlogPosts,
  useCreateBlogPost,
  useUpdateBlogPost,
  useDeleteBlogPost,
  type AdminBlogPost,
  type AdminBlogPostsParams,
  type CreateBlogPostInput,
} from "@/hooks/api/blog-admin";
import {
  DataTable,
  DataTableSkeleton,
  type DataTableColumn,
} from "@/components/ui/data-table";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { EntityFormSheet } from "@/components/shared/entity-form-sheet";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/ui/search-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FILTER_TOOLBAR_ROW,
  FILTER_SELECT_TRIGGER,
} from "@/components/ui/content-fill-panel";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { getErrorMessage } from "@/lib/get-error-message";
import type { BlogPostStatus } from "@/types/blog";
import { blogPostSchema, type BlogPostFormValues } from "./blog-post-schema";
import { BlogPostFormFields } from "./blog-post-form-fields";

const STATUS_FILTER_VALUES = [
  "all",
  "draft",
  "published",
  "archived",
] as const satisfies readonly (BlogPostStatus | "all")[];

type BlogStatusFilter = (typeof STATUS_FILTER_VALUES)[number];

function resolveStatusFilter(raw: string | null): BlogStatusFilter {
  return STATUS_FILTER_VALUES.find((candidate) => candidate === raw) ?? "all";
}

const STATUS_LABELS: Record<BlogPostStatus, string> = {
  draft: "Draft",
  published: "Published",
  archived: "Archived",
};

const STATUS_VARIANTS: Record<BlogPostStatus, string> = {
  draft: "text-status-warning-ink bg-status-warning-surface border-status-warning-rule",
  published: "text-status-success-ink bg-status-success-surface border-status-success-rule",
  archived: "text-muted-foreground bg-muted border-border",
};

function AddPostButton({ onClick }: { onClick: () => void }) {
  return (
    <AnimatedIconButton
      icon={PlusIcon}
      iconSize={14}
      iconClassName="mr-1.5"
      size="sm"
      onClick={onClick}
    >
      New post
    </AnimatedIconButton>
  );
}

function DeletePostButton({ post, onDelete }: { post: AdminBlogPost; onDelete: (post: AdminBlogPost) => void }) {
  return (
    <button
      type="button"
      className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
      onClick={(e) => { e.stopPropagation(); onDelete(post); }}
      aria-label={`Delete post ${post.title}`}
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  );
}

const PAGE_SIZE = 20;

interface EditPostSheetProps {
  postId: string;
  initialPost: AdminBlogPost;
  onClose: () => void;
  onSubmit: (values: BlogPostFormValues) => void;
  isSubmitting: boolean;
}

function EditPostSheet({ postId, initialPost, onClose, onSubmit, isSubmitting }: EditPostSheetProps) {
  const { data: freshPost } = useAdminBlogPost(postId);
  const post = freshPost ?? initialPost;

  return (
    <EntityFormSheet<BlogPostFormValues>
      open
      onOpenChange={(open) => { if (!open) onClose(); }}
      title={`Edit "${post.title}"`}
      resolver={zodResolver(blogPostSchema)}
      defaultValues={{
        title: post.title,
        excerpt: post.excerpt ?? undefined,
        content: "",
        coverImage: post.coverImage ?? undefined,
        status: post.status,
        isFeatured: post.isFeatured,
        categoryId: post.categoryId,
        tags: post.tags,
        slug: post.slug ?? "",
        metaTitle: post.metaTitle,
        metaDescription: post.metaDescription,
      }}
      onSubmit={onSubmit}
      isSubmitting={isSubmitting}
      submitLabel="Save changes"
    >
      {(form) => <BlogPostFormFields form={form} />}
    </EntityFormSheet>
  );
}

const COLUMNS: DataTableColumn<AdminBlogPost>[] = [
  {
    key: "title",
    header: "Title",
    cell: (row) => (
      <div className="min-w-0">
        <p className="font-medium truncate">{row.title}</p>
        <p className="text-xs text-muted-foreground truncate">{row.excerpt}</p>
      </div>
    ),
  },
  {
    key: "status",
    header: "Status",
    cell: (row) => (
      <Badge
        variant="outline"
        className={`h-5 px-2 py-0.5 text-micro ${STATUS_VARIANTS[row.status]}`}
      >
        {STATUS_LABELS[row.status]}
      </Badge>
    ),
  },
  {
    key: "category",
    header: "Category",
    cell: (row) =>
      row.category ? (
        <span className="text-sm">{row.category.name}</span>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    key: "publishedAt",
    header: "Published",
    cell: (row) =>
      row.publishedAt ? (
        <span className="font-mono tabular-nums text-xs">
          {format(new Date(row.publishedAt), "MMM d, yyyy")}
        </span>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
];

export function BlogAdminPosts() {
  const canManage = useCan("blog:posts:manage");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [statusFilter, setStatusFilter] = useState<BlogStatusFilter>(() =>
    resolveStatusFilter(searchParams.get("status")),
  );
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AdminBlogPost | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminBlogPost | null>(null);

  const params: AdminBlogPostsParams = {
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch || undefined,
    status: statusFilter,
  };

  const { data, isLoading, isError, error, refetch } = useAdminBlogPosts(params);
  const createPost = useCreateBlogPost();
  const updatePost = useUpdateBlogPost();
  const deletePost = useDeleteBlogPost();

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value);
      setPage(1);
      const p = new URLSearchParams(searchParams.toString());
      if (value) p.set("search", value);
      else p.delete("search");
      p.delete("page");
      router.replace(`${pathname}?${p.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const handleStatusChange = useCallback(
    (value: string) => {
      const s = resolveStatusFilter(value);
      setStatusFilter(s);
      setPage(1);
      const p = new URLSearchParams(searchParams.toString());
      if (s !== "all") p.set("status", s);
      else p.delete("status");
      p.delete("page");
      router.replace(`${pathname}?${p.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const handleCreate = useCallback(
    (values: BlogPostFormValues) => {
      const input: CreateBlogPostInput = {
        title: values.title,
        excerpt: values.excerpt,
        content: values.content,
        coverImage: values.coverImage,
        status: values.status,
        isFeatured: values.isFeatured,
        categoryId: values.categoryId ?? null,
        tags: values.tags,
        slug: values.slug ?? undefined,
        metaTitle: values.metaTitle ?? null,
        metaDescription: values.metaDescription ?? null,
      };
      createPost.mutate(input, {
        onSuccess: () => {
          toast.success("Post created");
          setCreateOpen(false);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      });
    },
    [createPost],
  );

  const handleUpdate = useCallback(
    (values: BlogPostFormValues) => {
      if (!editTarget) return;
      updatePost.mutate(
        {
          postId: editTarget.id,
          title: values.title,
          excerpt: values.excerpt,
          content: values.content,
          coverImage: values.coverImage,
          status: values.status,
          isFeatured: values.isFeatured,
          categoryId: values.categoryId ?? null,
          tags: values.tags,
          slug: values.slug ?? undefined,
          metaTitle: values.metaTitle ?? null,
          metaDescription: values.metaDescription ?? null,
        },
        {
          onSuccess: () => {
            toast.success("Post updated");
            setEditTarget(null);
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [editTarget, updatePost],
  );

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return;
    deletePost.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Post deleted");
        setDeleteTarget(null);
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }, [deleteTarget, deletePost]);

  const columnsWithActions: DataTableColumn<AdminBlogPost>[] = [
    ...COLUMNS,
    {
      key: "actions",
      header: "",
      className: "w-8",
      cell: (row) => (
        <DeletePostButton post={row} onDelete={setDeleteTarget} />
      ),
    },
  ];

  const emptyState = (
    <EmptyState
      illustration={<FileText className="h-8 w-8 text-muted-foreground/40" aria-hidden="true" />}
      title={debouncedSearch || statusFilter !== "all" ? "No posts match your filters" : "No posts yet"}
      description={
        debouncedSearch || statusFilter !== "all"
          ? "Try adjusting your search or status filter."
          : "Create your first blog post to get started."
      }
      action={
        !debouncedSearch && statusFilter === "all" && canManage
          ? { label: "New post", onClick: () => setCreateOpen(true) }
          : undefined
      }
      className="border-0 bg-transparent min-h-[40vh]"
    />
  );

  if (isError)
    return (
      <ErrorState
        className="flex-1"
        title="Couldn't load posts"
        description={getErrorMessage(error)}
        onRetry={() => void refetch()}
      />
    );

  const defaultPostValues: BlogPostFormValues = {
    title: "",
    excerpt: "",
    content: "",
    coverImage: "",
    status: "draft",
    isFeatured: false,
    categoryId: null,
    tags: [],
    slug: "",
    metaTitle: null,
    metaDescription: null,
  };

  return (
    <>
      <div className={`${FILTER_TOOLBAR_ROW} mb-3 shrink-0`}>
        <SearchInput
          placeholder="Search posts…"
          value={search}
          onValueChange={handleSearchChange}
          className="min-w-0 flex-1 lg:max-w-sm"
        />
        <Select value={statusFilter} onValueChange={handleStatusChange}>
          <SelectTrigger className={FILTER_SELECT_TRIGGER}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {canManage && <AddPostButton onClick={() => setCreateOpen(true)} />}
        </div>
      </div>

      {isLoading ? (
        <DataTableSkeleton rows={8} columns={5} />
      ) : (
        <DataTable
          data={data?.items ?? []}
          columns={columnsWithActions}
          getRowKey={(row) => row.id}
          isLoading={isLoading}
          emptyState={emptyState}
          minWidth="800px"
          className="flex-1 min-h-0"
          onRowClick={(row) => setEditTarget(row)}
          pagination={{
            mode: "server",
            page,
            pageSize: PAGE_SIZE,
            total: data?.total ?? 0,
            onPageChange: setPage,
          }}
        />
      )}

      <EntityFormSheet<BlogPostFormValues>
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="New post"
        description="Create a new blog post."
        resolver={zodResolver(blogPostSchema)}
        defaultValues={defaultPostValues}
        onSubmit={handleCreate}
        isSubmitting={createPost.isPending}
        submitLabel="Create post"
        resetOnOpen
      >
        {(form) => <BlogPostFormFields form={form} />}
      </EntityFormSheet>

      {editTarget && (
        <EditPostSheet
          postId={editTarget.id}
          initialPost={editTarget}
          onClose={() => setEditTarget(null)}
          onSubmit={handleUpdate}
          isSubmitting={updatePost.isPending}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title={`Delete "${deleteTarget?.title}"?`}
        description="This will permanently delete the post. This action cannot be undone."
        confirmLabel="Delete"
        destructive
        isPending={deletePost.isPending}
        onConfirm={handleDelete}
      />
    </>
  );
}
