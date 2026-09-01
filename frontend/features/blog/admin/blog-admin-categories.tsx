"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { Tag, Trash2 } from "lucide-react";
import { PlusIcon } from "@animateicons/react/lucide";
import { useCan } from "@/hooks/api/access";
import {
  useAdminBlogCategories,
  useCreateBlogCategory,
  useUpdateBlogCategory,
  useDeleteBlogCategory,
  type AdminBlogCategory,
  type CreateBlogCategoryInput,
} from "@/hooks/api/blog-admin";
import { DataTable, DataTableSkeleton, type DataTableColumn } from "@/components/ui/data-table";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { EntityFormDialog } from "@/components/shared/entity-form-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { getErrorMessage } from "@/lib/get-error-message";
import { blogCategorySchema, type BlogCategoryFormValues } from "./blog-category-schema";
import { BlogCategoryFormFields } from "./blog-category-form-fields";

function AddCategoryButton({ onClick }: { onClick: () => void }) {
  return (
    <AnimatedIconButton
      icon={PlusIcon}
      iconSize={14}
      iconClassName="mr-1.5"
      size="sm"
      onClick={onClick}
    >
      Add category
    </AnimatedIconButton>
  );
}

interface DeleteCategoryButtonProps {
  category: AdminBlogCategory;
  onDelete: (category: AdminBlogCategory) => void;
}

function DeleteCategoryButton({ category, onDelete }: DeleteCategoryButtonProps) {
  return (
    <button
      type="button"
      className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
      onClick={() => onDelete(category)}
      aria-label={`Delete category ${category.name}`}
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  );
}

const COLUMNS: DataTableColumn<AdminBlogCategory>[] = [
  {
    key: "name",
    header: "Name",
    cell: (row) => (
      <span className="font-medium">{row.name}</span>
    ),
  },
  {
    key: "description",
    header: "Description",
    cell: (row) => (
      <span className="text-muted-foreground truncate max-w-[280px] block">
        {row.description ?? "—"}
      </span>
    ),
  },
  {
    key: "color",
    header: "Colour",
    cell: (row) =>
      row.color ? (
        <div className="flex items-center gap-2">
          <span
            className="h-4 w-4 rounded-full border border-border/70 shrink-0"
            style={{ backgroundColor: row.color }}
            aria-hidden="true"
          />
          <span className="font-mono text-[11px] text-muted-foreground">{row.color}</span>
        </div>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    key: "postCount",
    header: "Posts",
    cell: (row) => (
      <Badge variant="outline" className="font-mono text-[10px]">
        {row.postCount}
      </Badge>
    ),
  },
];

export function BlogAdminCategories() {
  const canManage = useCan("blog:categories:manage");
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AdminBlogCategory | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminBlogCategory | null>(null);

  const { data, isLoading, isError, error, refetch } = useAdminBlogCategories();
  const createCategory = useCreateBlogCategory();
  const updateCategory = useUpdateBlogCategory();
  const deleteCategory = useDeleteBlogCategory();

  const handleCreate = useCallback(
    (values: BlogCategoryFormValues) => {
      const input: CreateBlogCategoryInput = {
        name: values.name,
        description: values.description ?? null,
        color: values.color ?? null,
      };
      createCategory.mutate(input, {
        onSuccess: () => {
          toast.success("Category created");
          setCreateOpen(false);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      });
    },
    [createCategory],
  );

  const handleUpdate = useCallback(
    (values: BlogCategoryFormValues) => {
      if (!editTarget) return;
      updateCategory.mutate(
        { categoryId: editTarget.id, ...values },
        {
          onSuccess: () => {
            toast.success("Category updated");
            setEditTarget(null);
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [editTarget, updateCategory],
  );

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return;
    deleteCategory.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Category deleted");
        setDeleteTarget(null);
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }, [deleteTarget, deleteCategory]);

  const columnsWithActions: DataTableColumn<AdminBlogCategory>[] = [
    ...COLUMNS,
    {
      key: "actions",
      header: "Actions",
      className: "w-8",
      cell: (row) => (
        <DeleteCategoryButton category={row} onDelete={setDeleteTarget} />
      ),
    },
  ];

  const emptyState = (
    <EmptyState
      illustration={<Tag className="h-8 w-8 text-muted-foreground/40" aria-hidden="true" />}
      title="No categories"
      description="Create a category to organise your blog posts."
      action={canManage ? { label: "Add category", onClick: () => setCreateOpen(true) } : undefined}
      className="border-0 bg-transparent min-h-[40vh]"
    />
  );

  if (isError)
    return (
      <ErrorState
        className="flex-1"
        title="Couldn't load categories"
        description={getErrorMessage(error)}
        onRetry={() => void refetch()}
      />
    );

  return (
    <>
      <div className="flex items-center justify-between gap-2 mb-3 shrink-0">
        <p className="text-sm text-muted-foreground">
          Organise your posts with categories.
        </p>
        {canManage && <AddCategoryButton onClick={() => setCreateOpen(true)} />}
      </div>

      {isLoading ? (
        <DataTableSkeleton rows={5} columns={4} />
      ) : (
        <DataTable
          data={data ?? []}
          columns={columnsWithActions}
          getRowKey={(row) => row.id}
          isLoading={isLoading}
          emptyState={emptyState}
          className="flex-1 min-h-0"
          onRowClick={(row) => setEditTarget(row)}
          pagination={{ pageSize: 20 }}
        />
      )}

      <EntityFormDialog<BlogCategoryFormValues>
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Add category"
        resolver={zodResolver(blogCategorySchema)}
        defaultValues={{ name: "", description: null, color: null }}
        onSubmit={handleCreate}
        isSubmitting={createCategory.isPending}
        submitLabel="Create category"
        resetOnOpen
      >
        {(form) => <BlogCategoryFormFields form={form} />}
      </EntityFormDialog>

      {editTarget && (
        <EntityFormDialog<BlogCategoryFormValues>
          open={!!editTarget}
          onOpenChange={(open) => { if (!open) setEditTarget(null); }}
          title={`Edit "${editTarget.name}"`}
          resolver={zodResolver(blogCategorySchema)}
          defaultValues={{
            name: editTarget.name,
            description: editTarget.description,
            color: editTarget.color,
          }}
          onSubmit={handleUpdate}
          isSubmitting={updateCategory.isPending}
          submitLabel="Save changes"
        >
          {(form) => <BlogCategoryFormFields form={form} />}
        </EntityFormDialog>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title={`Delete "${deleteTarget?.name}"?`}
        description="This will remove the category. Posts using it will not be deleted."
        confirmLabel="Delete"
        destructive
        isPending={deleteCategory.isPending}
        onConfirm={handleDelete}
      />
    </>
  );
}
