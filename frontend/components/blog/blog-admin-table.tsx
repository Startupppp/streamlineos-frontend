"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Pencil, Trash2, Eye, EyeOff, Plus } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { StatusBadge } from "./status-badge";
import { formatBlogDate } from "@/lib/blog-utils";
import { useAdminPosts, useDeletePost, useUpdatePost } from "@/hooks/api/blog";

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

  if (isLoading) {
    return (
      <div className="space-y-2 rounded-xl border border-border p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!posts || posts.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border p-12 text-center">
        <p className="text-muted-foreground">No posts yet.</p>
        <Button asChild>
          <Link href="/blogs/admin/new">
            <Plus className="size-4" /> Create your first post
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-xl border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden md:table-cell">Category</TableHead>
            <TableHead className="hidden md:table-cell">Author</TableHead>
            <TableHead className="hidden lg:table-cell">Updated</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {posts.map((post) => {
            const published = post.status === "published";
            return (
              <TableRow key={post.id}>
                <TableCell className="max-w-[280px]">
                  <Link
                    href={`/blogs/admin/${post.id}/edit`}
                    className="block truncate font-medium hover:text-primary"
                  >
                    {post.title}
                  </Link>
                  {post.isFeatured && (
                    <span className="text-xs text-primary">★ Featured</span>
                  )}
                </TableCell>
                <TableCell>
                  <StatusBadge status={post.status} />
                </TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground">
                  {post.category?.name ?? "-"}
                </TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground">
                  {post.author?.name ?? "-"}
                </TableCell>
                <TableCell className="hidden lg:table-cell text-muted-foreground">
                  {post.updatedAt ? formatBlogDate(post.updatedAt) : "-"}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      title={published ? "Unpublish" : "Publish"}
                      onClick={() => togglePublish(post.id, published)}
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
                      onClick={() => setToDelete({ id: post.id, title: post.title })}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      </div>
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
