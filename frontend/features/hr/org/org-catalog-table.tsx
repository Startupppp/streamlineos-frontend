"use client";

import { useState, useCallback, useMemo } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { Pencil, Trash2, Plus } from "lucide-react";
import { EllipsisIcon } from "@animateicons/react/lucide";
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
import { TruncatedText } from "@/components/ui/truncated-text";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { EntityFormSheet } from "@/components/shared/entity-form-sheet";
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

export function OrgCatalogTable<T extends CatalogItem>({
  title,
  items,
  isLoading,
  isError,
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
  const handleDeleteClick = useCallback(
    async (catalogItemId: number) => {
      try {
        await onDelete(catalogItemId);
        toast.success(`${title} deleted`);
      } catch (error) {
        toast.error(getErrorMessage(error));
      }
    },
    [onDelete, title],
  );

  const handleUpsertOpenChange = useCallback((open: boolean) => {
    setUpsertOpen(open);
    if (!open) setEditing(null);
  }, []);

  const filtered = (items ?? []).filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase()),
  );

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, skeletonIndex) => (
          <Skeleton key={skeletonIndex} className="h-10 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        title={`Failed to load ${title.toLowerCase()}s`}
        description="Something went wrong. Please try again."
        onRetry={onRetry}
      />
    );
  }

  return (
    <>
      <div className="flex items-center gap-2 mb-3">
        <SearchInput className="flex-1"
          value={search}
          onValueChange={handleSearch}
          placeholder={`Search ${title.toLowerCase()}s...`}
        />
        {canManage && (
          <Button size="sm" className="gap-1.5" onClick={handleCreate}>
            <Plus className="h-3.5 w-3.5" />
            Add {title}
          </Button>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          illustrationPreset={illustrationPreset}
          title={`No ${title.toLowerCase()}s found`}
          description={
            search
              ? "Try a different search term."
              : `Create your first ${title.toLowerCase()} to get started.`
          }
          action={
            canManage
              ? { label: `Add first ${title.toLowerCase()}`, onClick: handleCreate }
              : undefined
          }
          compact
        />
      ) : (
        <Card className="rounded-2xl border border-border/70 bg-card/90 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_28px_-14px_rgba(15,23,42,0.12)] overflow-hidden">
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {filtered.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <TruncatedText text={item.name} className="text-sm font-medium" />
                    {item.code && (
                      <p className="text-dense text-muted-foreground font-mono">
                        {item.code}
                      </p>
                    )}
                  </div>
                  {extraColumns.map((extraColumn, columnIndex) => (
                    <div
                      key={columnIndex}
                      className="shrink-0 text-xs text-muted-foreground"
                    >
                      {extraColumn.render(item)}
                    </div>
                  ))}
                  {canManage && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <AnimatedIconButton
                          icon={EllipsisIcon}
                          variant="ghost"
                          size="icon"
                          className="w-7 shrink-0"
                          aria-label="Actions"
                        />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-32">
                        <DropdownMenuItem
                          className="text-xs gap-2 cursor-pointer"
                          onClick={() => handleEdit(item)}
                        >
                          <Pencil className="h-3 w-3" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-xs gap-2 cursor-pointer text-destructive focus:text-destructive"
                          onClick={() => handleDeleteClick(item.id)}
                        >
                          <Trash2 className="h-3 w-3" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
