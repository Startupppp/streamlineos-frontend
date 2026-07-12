"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Pencil, Trash2, Eye, EyeOff, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { StatusBadge } from "./status-badge";
import { formatBlogDate } from "@/lib/blog-utils";
import { useAdminPosts, useDeletePost, useUpdatePost } from "@/hooks/api/blog";
import type { BlogPostWithRelations } from "@/types/blog";

const emptyState = (
  <div className="flex flex-col items-center gap-3 py-12 text-center">
    <p className="text-muted-foreground">No posts yet.</p>
    <Button asChild>
      <Link href="/blogs/admin/new">
        <Plus className="size-4" /> Create your first post
      </Link>
    </Button>
  </div>
);

export function BlogAdminTable() {
  const { data: posts, isLoading } = useAdminPosts();
  const deletePost = useDeletePost();
  const updatePost = useUpdatePost();
  const [toDelete, setToDelete] = useState<{ id: string; title: string } | null>(null);

  async function togglePublish(id: string, currentlyPublished: boolean) {
    try {
      await updatePost.mutateAsync({
        id,
        status: currentlyPublished ? "draft" : "published",
      });
      toast.success(currentlyPublished ? "Moved to draft" : "Post published");
    } catch {
      toast.error("Could not update status");
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    try {
      await deletePost.mutateAsync(toDelete.id);
      toast.success("Post deleted");
    } catch {
      toast.error("Could not delete post");
    } finally {
      setToDelete(null);
    }
  }

  function makeToggleHandler(id: string, published: boolean) {
    return function handleToggleClick() {
      void togglePublish(id, published);
    };
  }

  function makeDeleteHandler(id: string, title: string) {
    return function handleDeleteClick() {
      setToDelete({ id, title });
    };
  }

  const columns: DataTableColumn<BlogPostWithRelations>[] = [
    {
      key: "title",
      header: "Title",
      sortable: true,
      sortValue: (p) => p.title,
      cell: (post) => (
        <div className="max-w-[280px]">
          <Link
            href={`/blogs/admin/${post.id}/edit`}
            className="block truncate font-medium hover:text-primary"
          >
            {post.title}
          </Link>
          {post.isFeatured && (
            <span className="text-xs text-primary">★ Featured</span>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (post) => <StatusBadge status={post.status} />,
    },
    {
      key: "category",
      header: "Category",
      className: "hidden md:table-cell",
      headerClassName: "hidden md:table-cell",
      cell: (post) => (
        <span className="text-muted-foreground">{post.category?.name ?? "-"}</span>
      ),
    },
    {
      key: "author",
      header: "Author",
      className: "hidden md:table-cell",
      headerClassName: "hidden md:table-cell",
      cell: (post) => (
        <span className="text-muted-foreground">{post.author?.name ?? "-"}</span>
      ),
    },
    {
      key: "updatedAt",
      header: "Updated",
      className: "hidden lg:table-cell",
      headerClassName: "hidden lg:table-cell",
      cell: (post) => (
        <span className="text-muted-foreground">
          {post.updatedAt ? formatBlogDate(post.updatedAt) : "-"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      headerClassName: "text-right",
      cell: (post) => {
        const published = post.status === "published";
        return (
          <div className="flex items-center justify-end gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              title={published ? "Unpublish" : "Publish"}
              onClick={makeToggleHandler(post.id, published)}
            >
              {published ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </Button>
            <Button asChild variant="ghost" size="icon-sm" title="Edit">
              <Link href={`/blogs/admin/${post.id}/edit`}>
                <Pencil className="size-4" />
              </Link>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              title="Delete"
              className="text-destructive hover:text-destructive"
              onClick={makeDeleteHandler(post.id, post.title)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <>
      <DataTable<BlogPostWithRelations>
        data={posts ?? []}
        columns={columns}
        getRowKey={(post) => post.id}
        isLoading={isLoading}
        emptyState={emptyState}
      />
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => {
          if (!o) setToDelete(null);
        }}
        title="Delete post?"
        description={
          toDelete
            ? `"${toDelete.title}" will be permanently deleted. This action cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        destructive
        onConfirm={confirmDelete}
      />
    </>
  );
}
