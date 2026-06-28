"use client";

import { useState, useCallback, type ChangeEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Building2, Plus, Pencil, Trash2, Archive, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import {
  useBusinessUnits,
  useCreateBusinessUnit,
  useUpdateBusinessUnit,
  useDeleteBusinessUnit,
} from "@/lib/api/hooks/org-hierarchy";
import { getApiError } from "@/lib/api-client";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { OrgBusinessUnit } from "@/types/org-hierarchy";

const formSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  code: z
    .string()
    .trim()
    .min(2, "Code must be 2–20 characters")
    .max(20)
    .regex(/^[A-Za-z0-9]+$/, "Only alphanumeric characters"),
  description: z.string().trim().max(500).optional(),
});

type FormValues = z.infer<typeof formSchema>;

function TableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-md" />
      ))}
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-60 gap-3 text-muted-foreground">
      <Building2 className="h-10 w-10 opacity-30" />
      <p className="text-sm">No business units yet</p>
      <Button size="sm" onClick={onAdd}>
        <Plus className="h-4 w-4 mr-1.5" />
        Add Business Unit
      </Button>
    </div>
  );
}

function BuForm({
  defaultValues,
  onSubmit,
  isPending,
}: {
  defaultValues?: FormValues;
  onSubmit: (v: FormValues) => void;
  isPending: boolean;
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues ?? { name: "", code: "", description: "" },
  });

  return (
    <Form {...form}>
      <form id="bu-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Technology" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => {
            function handleCodeChange(e: ChangeEvent<HTMLInputElement>) {
              field.onChange(e.target.value.toUpperCase());
            }
            return (
              <FormItem>
                <FormLabel>Code</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. TECH" {...field} onChange={handleCodeChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            );
          }}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Optional description..." rows={3} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <SheetFooter>
          <Button type="submit" form="bu-form" disabled={isPending}>
            {isPending ? "Saving…" : "Save"}
          </Button>
        </SheetFooter>
      </form>
    </Form>
  );
}

export default function BusinessUnitsPage() {
  const { data: units, isLoading } = useBusinessUnits();
  const create = useCreateBusinessUnit();
  const update = useUpdateBusinessUnit();
  const remove = useDeleteBusinessUnit();

  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<OrgBusinessUnit | null>(null);
  const [deleting, setDeleting] = useState<OrgBusinessUnit | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const allUnits = units ?? [];
  const active = allUnits.filter((u) => u.status !== "ARCHIVED" && !u.deletedAt);
  const archived = allUnits.filter((u) => u.status === "ARCHIVED" && !u.deletedAt);
  const displayed = showArchived ? archived : active;

  const handleCreate = useCallback(
    (values: FormValues) => {
      create.mutate(
        { ...values, code: values.code.toUpperCase() },
        {
          onSuccess: () => {
            toast.success("Business unit created");
            setShowCreate(false);
          },
          onError: (err) => toast.error(getApiError(err)),
        },
      );
    },
    [create],
  );

  const handleUpdate = useCallback(
    (values: FormValues) => {
      if (!editing) return;
      update.mutate(
        { id: editing.id, ...values, code: values.code.toUpperCase() },
        {
          onSuccess: () => {
            toast.success("Business unit updated");
            setEditing(null);
          },
          onError: (err) => toast.error(getApiError(err)),
        },
      );
    },
    [editing, update],
  );

  const handleArchive = useCallback(
    (u: OrgBusinessUnit) => {
      update.mutate(
        { id: u.id, status: "ARCHIVED" },
        {
          onSuccess: () => toast.success("Business unit archived"),
          onError: (err) => toast.error(getApiError(err)),
        },
      );
    },
    [update],
  );

  const handleRestore = useCallback(
    (u: OrgBusinessUnit) => {
      update.mutate(
        { id: u.id, status: "ACTIVE" },
        {
          onSuccess: () => toast.success("Business unit restored"),
          onError: (err) => toast.error(getApiError(err)),
        },
      );
    },
    [update],
  );

  const handleDelete = useCallback(() => {
    if (!deleting) return;
    remove.mutate(deleting.id, {
      onSuccess: () => {
        toast.success("Business unit deleted");
        setDeleting(null);
      },
      onError: (err) => toast.error(getApiError(err)),
    });
  }, [deleting, remove]);

  const handleOpenCreate = useCallback(() => setShowCreate(true), []);
  const handleToggleArchived = useCallback(() => setShowArchived((v) => !v), []);

  function makeRestoreHandler(unit: OrgBusinessUnit) { return () => handleRestore(unit); }
  function makeArchiveHandler(unit: OrgBusinessUnit) { return () => handleArchive(unit); }
  function makeSetEditingHandler(unit: OrgBusinessUnit) { return () => setEditing(unit); }
  function makeSetDeletingHandler(unit: OrgBusinessUnit) { return () => setDeleting(unit); }
  function handleEditSheetOpenChange(open: boolean) { if (!open) setEditing(null); }
  function handleDeleteDialogOpenChange(open: boolean) { if (!open) setDeleting(null); }

  return (
    <PageWrapper
      title="Business Units"
      subtitle="Top-level organizational divisions within your company."
      actions={
        <div className="flex items-center gap-2">
          {archived.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleToggleArchived}>
              <Archive className="h-4 w-4 mr-1.5" />
              {showArchived ? "Show Active" : `Archived (${archived.length})`}
            </Button>
          )}
          <Button size="sm" onClick={handleOpenCreate}>
            <Plus className="h-4 w-4 mr-1.5" />
            Add Business Unit
          </Button>
        </div>
      }
    >
      {isLoading ? (
        <TableSkeleton />
      ) : displayed.length === 0 ? (
        showArchived ? (
          <div className="flex flex-col items-center justify-center h-60 gap-3 text-muted-foreground">
            <Archive className="h-10 w-10 opacity-30" />
            <p className="text-sm">No archived business units</p>
          </div>
        ) : (
          <EmptyState onAdd={handleOpenCreate} />
        )
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-28" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayed.map((u) => (
              <TableRow key={u.id} className={u.status === "ARCHIVED" ? "opacity-60" : ""}>
                <TableCell className="font-medium">{u.name}</TableCell>
                <TableCell>
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{u.code}</code>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={u.status === "ACTIVE" ? "outline" : "secondary"}
                    className={
                      u.status === "ACTIVE"
                        ? "text-green-700 border-green-200 bg-green-50 dark:bg-green-900/20 dark:text-green-400"
                        : u.status === "ARCHIVED"
                          ? "text-amber-700 border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400"
                          : ""
                    }
                  >
                    {u.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground max-w-[200px] truncate">
                  {u.description ?? "—"}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {u.status === "ARCHIVED" ? (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={makeRestoreHandler(u)}
                          title="Restore"
                        >
                          <RotateCcw className="h-4 w-4 text-blue-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={makeSetDeletingHandler(u)}
                          title="Delete permanently"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button variant="ghost" size="sm" onClick={makeSetEditingHandler(u)} title="Edit">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={makeArchiveHandler(u)}
                          title="Archive"
                        >
                          <Archive className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Sheet open={showCreate} onOpenChange={setShowCreate}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>New Business Unit</SheetTitle>
          </SheetHeader>
          <BuForm onSubmit={handleCreate} isPending={create.isPending} />
        </SheetContent>
      </Sheet>

      <Sheet open={!!editing} onOpenChange={handleEditSheetOpenChange}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Edit Business Unit</SheetTitle>
          </SheetHeader>
          {editing && (
            <BuForm
              defaultValues={{
                name: editing.name,
                code: editing.code,
                description: editing.description ?? "",
              }}
              onSubmit={handleUpdate}
              isPending={update.isPending}
            />
          )}
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={handleDeleteDialogOpenChange}
        title="Delete Business Unit"
        description={`Permanently delete "${deleting?.name}"? This cannot be undone.`}
        onConfirm={handleDelete}
        isPending={remove.isPending}
        destructive
      />
    </PageWrapper>
  );
}
