"use client";

import { useState, useCallback, useMemo } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { Pencil, Trash2 } from "lucide-react";
import { EllipsisIcon, PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { EntityFormSheet } from "@/components/shared/entity-form-sheet";
import { TABLE_TITLE_CELL, TEXT_ONE_LINE } from "@/lib/text-overflow";
import { cn } from "@/lib/utils";
import type { StateIllustrationPreset } from "@/components/illustrations/state-illustration";
import type { OrgCatalogInput } from "@/types/hr/core";

interface CatalogItem {
  id: number;
  name: string;
  code?: string | null;
  description?: string | null;
}

interface OrgCatalogTableProps<T extends CatalogItem> {
  title: string;
  items: T[] | undefined;
  isLoading: boolean;
  isError: boolean;
  /** Passed through to `getErrorMessage`, so the failure names itself (FE-41). */
  error?: unknown;
  onRetry: () => void;
  canManage: boolean;
  onCreate: (catalog: OrgCatalogInput) => Promise<unknown>;
  onUpdate: (catalogItemId: number, catalog: OrgCatalogInput) => Promise<unknown>;
  onDelete: (catalogItemId: number) => Promise<unknown>;
  isCreating: boolean;
  isUpdating: boolean;
  extraColumns?: Array<{ label: string; render: (item: T) => React.ReactNode }>;
  illustrationPreset?: StateIllustrationPreset;
}

const catalogFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be at most 100 characters")
    .refine((v) => !/\s{2,}/.test(v), "Name cannot have consecutive spaces")
    .refine((v) => /[a-zA-Z]/.test(v), "Name must contain at least one letter")
    .refine(
      (v) => !/[^\p{L}\p{N}\s]{2,}/u.test(v),
      "Name cannot have consecutive special characters",
    ),
  code: z
    .string()
    .trim()
    .refine(
      (v) =>
        v === "" ||
        (/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(v) && v.length <= 20),
      "Code can only use letters, numbers, hyphens, and underscores (max 20)",
    ),
});

type CatalogFormValues = z.infer<typeof catalogFormSchema>;

function UpsertSheet({
  open,
  onOpenChange,
  title,
  initial,
  onCreate,
  onUpdate,
  isCreating,
  isUpdating,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  initial?: CatalogItem;
  onCreate: (catalog: OrgCatalogInput) => Promise<unknown>;
  onUpdate: (catalogItemId: number, catalog: OrgCatalogInput) => Promise<unknown>;
  isCreating: boolean;
  isUpdating: boolean;
}) {
  const isEdit = initial?.id !== undefined;
  const defaultValues = useMemo(
    () => ({
      name: initial?.name ?? "",
      code: initial?.code ?? "",
    }),
    [initial?.name, initial?.code],
  );

  async function handleSubmit(values: CatalogFormValues) {
    const payload: OrgCatalogInput = {
      name: values.name.replace(/\s+/g, " ").trim(),
      code: values.code.trim() ? values.code.trim().toUpperCase() : undefined,
    };
    try {
      if (isEdit && initial) {
        await onUpdate(initial.id, payload);
        toast.success(`${title} updated`);
      } else {
        await onCreate(payload);
        toast.success(`${title} created`);
      }
      onOpenChange(false);
    } catch (mutationError) {
      toast.error(getErrorMessage(mutationError));
    }
  }

  return (
    <EntityFormSheet<CatalogFormValues>
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? `Edit ${title}` : `New ${title}`}
      description={
        isEdit
          ? `Update this ${title.toLowerCase()}.`
          : `Add a ${title.toLowerCase()} to your organisation catalog.`
      }
      resolver={zodResolver(catalogFormSchema)}
      defaultValues={defaultValues}
      onSubmit={handleSubmit}
      isSubmitting={isEdit ? isUpdating : isCreating}
      submitLabel={isEdit ? "Save" : "Create"}
      className="sm:max-w-md"
      resetOnOpen
    >
      {(form) => (
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder={`${title} name`}
                    autoFocus
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Code{" "}
                  <span className="text-muted-foreground font-normal">
                    (optional)
                  </span>
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g. ENG"
                    className="font-mono uppercase"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </EntityFormSheet>
  );
}

function getCatalogRowKey(item: CatalogItem): number {
  return item.id;
}

/**
 * A row's own component so the edit and delete handlers are named rather than
 * arrows closed over the row inside a `cell` callback (FE-69).
 */
function CatalogRowActions<T extends CatalogItem>({
  item,
  onEdit,
  onDelete,
}: {
  item: T;
  onEdit: (item: T) => void;
  onDelete: (item: T) => void;
}) {
  function handleEditClick() {
    onEdit(item);
  }

  function handleDeleteClick() {
    onDelete(item);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <AnimatedIconButton
          icon={EllipsisIcon}
          variant="ghost"
          size="icon"
          className="shrink-0"
          aria-label={`Actions for ${item.name}`}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-32">
        <DropdownMenuItem className="cursor-pointer gap-2 text-xs" onClick={handleEditClick}>
          <Pencil className="h-3 w-3" /> Edit
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer gap-2 text-xs text-destructive focus:text-destructive"
          onClick={handleDeleteClick}
        >
          <Trash2 className="h-3 w-3" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function OrgCatalogTable<T extends CatalogItem>({
  title,
  items,
  isLoading,
  isError,
  error,
  onRetry,
  canManage,
  onCreate,
  onUpdate,
  onDelete,
  isCreating,
  isUpdating,
  extraColumns = [],
  illustrationPreset = "default",
}: OrgCatalogTableProps<T>) {
  const [search, setSearch] = useState("");
  const [upsertOpen, setUpsertOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);

  const handleSearch = useCallback((value: string) => setSearch(value), []);
  const handleCreate = useCallback(() => {
    setEditing(null);
    setUpsertOpen(true);
  }, []);
  const handleEdit = useCallback((item: T) => {
    setEditing(item);
    setUpsertOpen(true);
  }, []);
  // Delete used to fire from the menu with no confirmation (FE-83).
  const [pendingDelete, setPendingDelete] = useState<T | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const handleDeleteClick = useCallback((item: T) => setPendingDelete(item), []);
  const handleDeleteOpenChange = useCallback((open: boolean) => {
    if (!open) setPendingDelete(null);
  }, []);
  const handleDeleteConfirm = useCallback(async () => {
    if (!pendingDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(pendingDelete.id);
      toast.success(`Deleted ${title.toLowerCase()} "${pendingDelete.name}"`);
      setPendingDelete(null);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsDeleting(false);
    }
  }, [onDelete, pendingDelete, title]);

  const handleUpsertOpenChange = useCallback((open: boolean) => {
    setUpsertOpen(open);
    if (!open) setEditing(null);
  }, []);

  const handleClearFilters = useCallback(() => setSearch(""), []);

  const filtered = (items ?? []).filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase()),
  );
  const filtersActive = search.trim().length > 0;

  /**
   * Ticket 05. Position Control is the reference for this surface, so the rows
   * are a `DataTable` with the same toolbar shape (filter, count, one primary
   * action on the right) rather than the bespoke divided card this used to
   * render. The table also bounds what is mounted: the catalog reads are
   * unpaginated, and the old `filtered.map` mounted every row (FE-112).
   */
  const columns: DataTableColumn<T>[] = useMemo(() => {
    const base: DataTableColumn<T>[] = [
      {
        key: "name",
        header: "Name",
        className: TABLE_TITLE_CELL,
        sortable: true,
        cell: (item) => (
          <span className={cn("text-sm font-medium", TEXT_ONE_LINE)} title={item.name}>
            {item.name}
          </span>
        ),
      },
      {
        key: "code",
        header: "Code",
        headerClassName: "w-[120px]",
        className: "font-mono text-xs text-muted-foreground",
        sortable: true,
        cell: (item) => item.code ?? "—",
      },
      ...extraColumns.map((extraColumn) => ({
        key: `extra-${extraColumn.label}`,
        header: extraColumn.label,
        className: "text-xs text-muted-foreground",
        cell: extraColumn.render,
      })),
    ];

    if (!canManage) return base;
    return [
      ...base,
      {
        key: "actions",
        header: "",
        headerClassName: "w-[52px]",
        cell: (item) => (
          <CatalogRowActions item={item} onEdit={handleEdit} onDelete={handleDeleteClick} />
        ),
      },
    ];
  }, [canManage, extraColumns, handleEdit, handleDeleteClick]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 12 }).map((_, skeletonIndex) => (
          <Skeleton key={skeletonIndex} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        className="flex-1"
        title={`Couldn't load ${title.toLowerCase()}s`}
        description={getErrorMessage(error)}
        onRetry={onRetry}
      />
    );
  }

  return (
    <>
      <div className="mb-4 flex items-center gap-3">
        <SearchInput
          value={search}
          onValueChange={handleSearch}
          placeholder={`Search ${title.toLowerCase()}s…`}
          aria-label={`Search ${title.toLowerCase()}s`}
        />
        <p className="whitespace-nowrap text-sm text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? title.toLowerCase() : `${title.toLowerCase()}s`}
        </p>
        {canManage ? (
          <AnimatedIconButton
            icon={PlusIcon}
            iconSize={14}
            iconClassName="mr-1.5"
            size="sm"
            className="ml-auto"
            onClick={handleCreate}
          >
            Add {title.toLowerCase()}
          </AnimatedIconButton>
        ) : null}
      </div>
      <DataTable<T>
        className="min-h-0 flex-1"
        columns={columns}
        data={filtered}
        getRowKey={getCatalogRowKey}
        pagination={{ pageSize: 20 }}
        emptyState={
          <EmptyState
            illustrationPreset={illustrationPreset}
            illustrationSize="md"
            title={`No ${title.toLowerCase()}s yet`}
            description={
              filtersActive
                ? undefined
                : `Create your first ${title.toLowerCase()} to get started.`
            }
            filtersActive={filtersActive}
            onClearFilters={handleClearFilters}
            action={
              !filtersActive && canManage
                ? { label: `Add ${title.toLowerCase()}`, onClick: handleCreate }
                : undefined
            }
            compact
          />
        }
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={handleDeleteOpenChange}
        title={`Delete ${title.toLowerCase()}?`}
        description={
          pendingDelete
            ? `"${pendingDelete.name}" will be deleted from the catalog.`
            : ""
        }
        confirmLabel="Delete"
        destructive
        isPending={isDeleting}
        keepOpenOnConfirm
        onConfirm={handleDeleteConfirm}
      />

      <UpsertSheet
        open={upsertOpen}
        onOpenChange={handleUpsertOpenChange}
        title={title}
        initial={editing ?? undefined}
        onCreate={onCreate}
        onUpdate={onUpdate}
        isCreating={isCreating}
        isUpdating={isUpdating}
      />
    </>
  );
}
