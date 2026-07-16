"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingButton } from "@/components/ui/loading-button";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { TruncatedText } from "@/components/ui/truncated-text";
import type { OrgCatalogInput } from "@/types/hr/core";
import type { UseMutationResult } from "@tanstack/react-query";

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
  canManage: boolean;
  onCreate: UseMutationResult<unknown, Error, OrgCatalogInput>;
  onUpdate: UseMutationResult<unknown, Error, OrgCatalogInput & { id: number }>;
  onDelete: UseMutationResult<unknown, Error, number>;
  extraColumns?: Array<{ label: string; render: (item: T) => React.ReactNode }>;
}

function UpsertDialog({
  open,
  onOpenChange,
  title,
  initial,
  onCreate,
  onUpdate,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  initial?: CatalogItem;
  onCreate: UseMutationResult<unknown, Error, OrgCatalogInput>;
  onUpdate: UseMutationResult<unknown, Error, OrgCatalogInput & { id: number }>;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [code, setCode] = useState(initial?.code ?? "");

  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value),
    [],
  );
  const handleCodeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setCode(e.target.value),
    [],
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const payload: OrgCatalogInput = {
        name: name.trim(),
        code: code.trim() || undefined,
      };
      if (initial?.id !== undefined) {
        onUpdate.mutate(
          { ...payload, id: initial.id },
          {
            onSuccess: () => {
              toast.success(`${title} updated`);
              onOpenChange(false);
            },
            onError: (err) => toast.error(getErrorMessage(err)),
          },
        );
      } else {
        onCreate.mutate(payload, {
          onSuccess: () => {
            toast.success(`${title} created`);
            onOpenChange(false);
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        });
      }
    },
    [name, code, initial, onCreate, onUpdate, title, onOpenChange],
  );

  const isPending = initial ? onUpdate.isPending : onCreate.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm">
            {initial ? `Edit ${title}` : `New ${title}`}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 pt-1">
          <div className="space-y-1.5">
            <Label className="text-xs">Name</Label>
            <Input
              value={name}
              onChange={handleNameChange}
              placeholder={`${title} name`}
              className="text-sm"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">
              Code{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>
            <Input
              value={code}
              onChange={handleCodeChange}
              placeholder="Short code"
              className="text-sm font-mono"
            />
          </div>
          <DialogFooter className="pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <LoadingButton type="submit" size="sm" isPending={isPending}>
              {initial ? "Save" : "Create"}
            </LoadingButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function OrgCatalogTable<T extends CatalogItem>({
  title,
  items,
  isLoading,
  canManage,
  onCreate,
  onUpdate,
  onDelete,
  extraColumns = [],
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
    (id: number) => {
      onDelete.mutate(id, {
        onSuccess: () => toast.success(`${title} deleted`),
        onError: (err) => toast.error(getErrorMessage(err)),
      });
    },
    [onDelete, title],
  );

  const handleUpsertOpenChange = useCallback((o: boolean) => {
    setUpsertOpen(o);
    if (!o) setEditing(null);
  }, []);

  const filtered = (items ?? []).filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase()),
  );

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2 mb-3">
        <SearchInput
          className="max-w-xs flex-1"
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
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm font-medium text-foreground">
            No {title.toLowerCase()}s found
          </p>
          {canManage && (
            <Button
              size="sm"
              variant="outline"
              className="mt-3 h-8 gap-1.5"
              onClick={handleCreate}
            >
              <Plus className="h-3.5 w-3.5" />
              Add first {title.toLowerCase()}
            </Button>
          )}
        </div>
      ) : (
        <Card className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
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
                      <p className="text-[11px] text-muted-foreground font-mono">
                        {item.code}
                      </p>
                    )}
                  </div>
                  {extraColumns.map((col, i) => (
                    <div
                      key={i}
                      className="shrink-0 text-xs text-muted-foreground"
                    >
                      {col.render(item)}
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

      <UpsertDialog
        open={upsertOpen}
        onOpenChange={handleUpsertOpenChange}
        title={title}
        initial={editing ?? undefined}
        onCreate={onCreate}
        onUpdate={onUpdate}
      />
    </>
  );
}
