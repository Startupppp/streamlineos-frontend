"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Trash2, Pencil, X } from "lucide-react";
import { TruncatedText } from "@/components/ui/truncated-text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from "@/hooks/api/blog";
import { getErrorMessage } from "@/lib/get-error-message";

const DEFAULT_COLOR = "#3B82F6";

export function CategoriesManager() {
  const { data: categories, isLoading } = useCategories();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [description, setDescription] = useState("");
  const [toDelete, setToDelete] = useState<{ id: string; name: string } | null>(null);

  const saving = createCategory.isPending || updateCategory.isPending;

  function reset() {
    setEditingId(null);
    setName("");
    setColor(DEFAULT_COLOR);
    setDescription("");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const payload = { name: name.trim(), color, description: description.trim() || null };
    try {
      if (editingId) {
        await updateCategory.mutateAsync({ id: editingId, ...payload });
        toast.success("Category updated");
      } else {
        await createCategory.mutateAsync(payload);
        toast.success("Category created");
      }
      reset();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    try {
      await deleteCategory.mutateAsync(toDelete.id);
      toast.success("Category deleted");
      if (editingId === toDelete.id) reset();
    } catch {
      toast.error("Could not delete category");
    } finally {
      setToDelete(null);
    }
  }

  return (
    <>
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="rounded-xl border border-border">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !categories || categories.length === 0 ? (
          <p className="p-8 text-center text-muted-foreground">No categories yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {categories.map((c) => (
              <li key={c.id} className="flex items-center gap-3 p-4">
                <span
                  className="size-4 shrink-0 rounded-full border border-black/5"
                  style={{ backgroundColor: c.color ?? "#999" }}
                />
                <div className="min-w-0 flex-1">
                  <TruncatedText text={c.name} className="font-medium" />
                  {c.description && (
                    <TruncatedText text={c.description} className="text-sm text-muted-foreground" />
                  )}
                </div>
                <span className="text-sm text-muted-foreground">{c.count} posts</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  title="Edit"
                  onClick={() => {
                    setEditingId(c.id);
                    setName(c.name);
                    setColor(c.color ?? DEFAULT_COLOR);
                    setDescription(c.description ?? "");
                  }}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  title="Delete"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setToDelete({ id: c.id, name: c.name })}
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form onSubmit={onSubmit} className="h-fit space-y-4 rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <p className="font-semibold">{editingId ? "Edit category" : "New category"}</p>
          {editingId && (
            <Button type="button" variant="ghost" size="icon-sm" title="Cancel edit" onClick={reset}>
              <X className="size-4" />
            </Button>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="category-name">Name</Label>
          <Input id="category-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Technology" />
        </div>

        <div className="space-y-1.5">
          <Label id="category-color-label">Color</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-9 w-12 cursor-pointer rounded-md border border-input bg-transparent"
              aria-labelledby="category-color-label"
            />
            <Input value={color} onChange={(e) => setColor(e.target.value)} className="font-mono" aria-label="Color hex value" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="category-description">Description</Label>
          <Textarea
            id="category-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Optional"
          />
        </div>

        <Button type="submit" disabled={saving} className="w-full">
          {saving ? "Saving…" : editingId ? "Update category" : "Add category"}
        </Button>
      </form>
    </div>
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => {
          if (!o) setToDelete(null);
        }}
        title="Delete category?"
        description={
          toDelete
            ? `"${toDelete.name}" will be deleted. Posts keep their content but lose this category.`
            : ""
        }
        confirmLabel="Delete"
        destructive
        onConfirm={confirmDelete}
      />
    </>
  );
}
