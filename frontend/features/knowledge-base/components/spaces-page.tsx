"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetBody } from "@/components/ui/sheet";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useCan } from "@/hooks/api/access";
import {
  useKbSpaces,
  useCreateKbSpace,
  useUpdateKbSpace,
  useDeleteKbSpace,
} from "@/hooks/api/kb/spaces";
import { useKbPagesTree } from "@/hooks/api/kb/pages";
import { spaceHref } from "@/features/knowledge-base/lib/knowledge-routes";
import {
  KbLayoutGridIcon,
  KbPlusIcon,
  KbPencilIcon,
  KbTrash2Icon,
} from "@/features/knowledge-base/lib/kb-icons";
import type { KbSpace, KbAudience } from "@/types/kb";
import Link from "next/link";

const spaceSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  audience: z.enum(["internal", "public", "mixed"]).optional(),
});

type SpaceFormValues = z.infer<typeof spaceSchema>;

const AUDIENCE_LABELS: Record<KbAudience, string> = {
  internal: "Internal",
  public: "Public",
  mixed: "Mixed",
};

const AUDIENCE_BADGE_CLASS: Record<KbAudience, string> = {
  internal: "bg-muted text-muted-foreground border-border",
  public: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  mixed: "bg-primary/10 text-foreground border-primary/20",
};

function SpaceCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-2">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-16" />
    </div>
  );
}

interface SpaceCardProps {
  space: KbSpace;
  canManage: boolean;
  pageCount: number;
  onEdit: (space: KbSpace) => void;
  onDelete: (space: KbSpace) => void;
}

function SpaceCard({
  space,
  canManage,
  pageCount,
  onEdit,
  onDelete,
}: SpaceCardProps) {
  function handleEdit(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    onEdit(space);
  }

  function handleDelete(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    onDelete(space);
  }

  const audience = space.audience ?? "internal";

  return (
    <Link
      href={spaceHref(space.id)}
      className="bg-card border border-border rounded-xl p-4 flex flex-col gap-2 hover:bg-muted/40 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg shrink-0">{space.icon ?? "📚"}</span>
          <span className="text-sm font-semibold text-foreground truncate">
            {space.name}
          </span>
        </div>
        <Badge
          variant="outline"
          className={`text-[10px] h-4 px-1.5 shrink-0 ${AUDIENCE_BADGE_CLASS[audience]}`}
        >
          {AUDIENCE_LABELS[audience]}
        </Badge>
      </div>
      {space.description && (
        <p className="text-sm text-muted-foreground line-clamp-1">
          {space.description}
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        {pageCount} {pageCount === 1 ? "page" : "pages"}
      </p>
      {canManage && (
        <div className="flex items-center gap-1 pt-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground"
            onClick={handleEdit}
          >
            <KbPencilIcon className="h-3 w-3 mr-1" />
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
            onClick={handleDelete}
          >
            <KbTrash2Icon className="h-3 w-3 mr-1" />
            Delete
          </Button>
        </div>
      )}
    </Link>
  );
}

interface SpaceSheetProps {
  open: boolean;
  editingSpace: KbSpace | null;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

function SpaceSheet({
  open,
  editingSpace,
  onOpenChange,
  onSuccess,
}: SpaceSheetProps) {
  const createSpace = useCreateKbSpace();
  const updateSpace = useUpdateKbSpace();

  const form = useForm<SpaceFormValues>({
    resolver: zodResolver(spaceSchema),
    defaultValues: {
      name: editingSpace?.name ?? "",
      description: editingSpace?.description ?? null,
      icon: editingSpace?.icon ?? null,
      audience: (editingSpace?.audience ?? "internal") as KbAudience,
    },
  });

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      form.reset();
    }
    onOpenChange(nextOpen);
  }

  function handleSubmit(values: SpaceFormValues) {
    if (editingSpace) {
      updateSpace.mutate(
        {
          spaceId: editingSpace.id,
          name: values.name,
          description: values.description ?? null,
          icon: values.icon ?? null,
          audience: values.audience,
        },
        {
          onSuccess: () => {
            toast.success("Space updated");
            form.reset();
            onSuccess();
          },
          onError: () => toast.error("Failed to update space"),
        },
      );
    } else {
      createSpace.mutate(
        {
          name: values.name,
          description: values.description ?? null,
          icon: values.icon ?? null,
          audience: values.audience,
        },
        {
          onSuccess: () => {
            toast.success("Space created");
            form.reset();
            onSuccess();
          },
          onError: () => toast.error("Failed to create space"),
        },
      );
    }
  }

  function handleCancel() {
    form.reset();
    onOpenChange(false);
  }

  const isPending = createSpace.isPending || updateSpace.isPending;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="px-6 py-4 border-b shrink-0">
          <SheetTitle>
            {editingSpace ? "Edit space" : "Create space"}
          </SheetTitle>
        </SheetHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex flex-col flex-1 min-h-0"
          >
            <SheetBody className="px-6 py-5 space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Space name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        value={field.value ?? ""}
                        placeholder="Optional description"
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="icon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Icon (emoji)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ""}
                        placeholder="e.g. 📚"
                        maxLength={8}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="audience"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Audience</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value ?? "internal"}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="internal">Internal</SelectItem>
                          <SelectItem value="public">Public</SelectItem>
                          <SelectItem value="mixed">Mixed</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </SheetBody>
            <SheetFooter className="px-6 py-4 border-t shrink-0 flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={handleCancel}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={isPending}>
                {editingSpace ? "Save" : "Create"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}

export default function SpacesPage() {
  const canManage = useCan("kb:spaces:manage");
  const { data: spaces = [], isLoading, isError } = useKbSpaces();
  const { data: treeNodes = [] } = useKbPagesTree();
  const pageCountBySpaceId = treeNodes.reduce<Record<number, number>>(
    (acc, n) => {
      if (n.spaceId != null) {
        acc[n.spaceId] = (acc[n.spaceId] ?? 0) + 1;
      }
      return acc;
    },
    {},
  );
  const deleteSpace = useDeleteKbSpace();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingSpace, setEditingSpace] = useState<KbSpace | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<KbSpace | null>(null);

  function handleCreate() {
    setEditingSpace(null);
    setSheetOpen(true);
  }

  function handleEdit(space: KbSpace) {
    setEditingSpace(space);
    setSheetOpen(true);
  }

  function handleDelete(space: KbSpace) {
    setDeleteTarget(space);
  }

  function handleSheetOpenChange(open: boolean) {
    setSheetOpen(open);
    if (!open) setEditingSpace(null);
  }

  function handleSheetSuccess() {
    setSheetOpen(false);
    setEditingSpace(null);
  }

  function handleDeleteAlertOpenChange(open: boolean) {
    if (!open) setDeleteTarget(null);
  }

  function handleConfirmDelete() {
    if (!deleteTarget) return;
    deleteSpace.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Space deleted");
        setDeleteTarget(null);
      },
      onError: () => toast.error("Failed to delete space"),
    });
  }

  const subtitle =
    !isLoading && !isError
      ? `${spaces.length} space${spaces.length === 1 ? "" : "s"}`
      : undefined;

  return (
    <PageWrapper
      title="Spaces"
      subtitle={subtitle}
      actions={
        canManage ? (
          <Button size="sm" onClick={handleCreate}>
            <KbPlusIcon className="h-4 w-4 mr-1.5" />
            New space
          </Button>
        ) : undefined
      }
    >
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SpaceCardSkeleton key={i} />
          ))}
        </div>
      )}

      {!isLoading && isError && (
        <EmptyState
          illustration={
            <KbLayoutGridIcon className="h-8 w-8 text-muted-foreground/40" />
          }
          title="Could not load spaces"
          description="There was a problem fetching spaces."
          className={CONTENT_FILL_PANEL}
        />
      )}

      {!isLoading && !isError && spaces.length === 0 && (
        <EmptyState
          illustration={
            <KbLayoutGridIcon className="h-8 w-8 text-muted-foreground/40" />
          }
          title="No spaces yet"
          description="Create a space to organize your wiki pages."
          action={
            canManage
              ? { label: "Create space", onClick: handleCreate }
              : undefined
          }
          className={CONTENT_FILL_PANEL}
        />
      )}

      {!isLoading && !isError && spaces.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {spaces.map((space) => (
            <SpaceCard
              key={space.id}
              space={space}
              canManage={canManage}
              pageCount={pageCountBySpaceId[space.id] ?? 0}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <SpaceSheet
        open={sheetOpen}
        editingSpace={editingSpace}
        onOpenChange={handleSheetOpenChange}
        onSuccess={handleSheetSuccess}
      />

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={handleDeleteAlertOpenChange}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete space?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleConfirmDelete}
              disabled={deleteSpace.isPending}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}
