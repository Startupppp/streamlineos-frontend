"use client";

import { useState, useCallback, type ChangeEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Building2, Plus, Pencil, Trash2, Archive, RotateCcw, Search } from "lucide-react";
import { toast } from "sonner";
import {
  useBusinessUnits,
  useCreateBusinessUnit,
  useUpdateBusinessUnit,
  useDeleteBusinessUnit,
} from "@/hooks/api/org-hierarchy";
import { getApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
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
import { SkeletonTable } from "@/components/shared/skeletons/skeleton-table";
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
  const [search, setSearch] = useState("");

  const allUnits = units?.data ?? [];
  const active = allUnits.filter((u) => u.status !== "ARCHIVED" && !u.deletedAt);
  const archived = allUnits.filter((u) => u.status === "ARCHIVED" && !u.deletedAt);
  const displayed = showArchived ? archived : active;
  const filtered = search
    ? displayed.filter((u) => {
        const q = search.toLowerCase();
        return (
          u.name.toLowerCase().includes(q) ||
          u.code.toLowerCase().includes(q)
        );
      })
    : displayed;

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
  const handleSearchChange = useCallback((e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value), []);

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
        <Button size="sm" onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-1.5" />
          Add Business Unit
        </Button>
      }
      filters={
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search business units…"
              value={search}
              onChange={handleSearchChange}
              className="pl-8 h-8 text-xs max-w-[240px]"
            />
          </div>
          {archived.length > 0 && (
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleToggleArchived}>
              <Archive className="h-4 w-4 mr-1.5" />
              {showArchived ? "Show Active" : `Archived (${archived.length})`}
            </Button>
          )}
        </div>
      }
    >
      {isLoading ? (
        <SkeletonTable rows={5} columns={5} />
      ) : filtered.length === 0 ? (
        search ? (
          <EmptyState
            illustration={<Building2 className="h-8 w-8 text-muted-foreground/40" />}
            title={`No business units matching "${search}"`}
            description="Try a different search term."
            compact
            className="min-h-[200px]"
          />
        ) : showArchived ? (
          <EmptyState
            illustration={<Archive className="h-8 w-8 text-muted-foreground/40" />}
            title="No archived business units"
            compact
            className="min-h-[200px]"
          />
        ) : (
          <EmptyState
            illustration={<Building2 className="h-8 w-8 text-muted-foreground/40" />}
            title="No business units yet"
            description="Create your first business unit to get started."
            action={{ label: "Add Business Unit", onClick: handleOpenCreate }}
            className="min-h-[40vh]"
          />
        )
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[580px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Name</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Code</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Status</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Description</TableHead>
                  <TableHead className="w-28 px-2 py-1.5" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u) => (
                  <TableRow key={u.id} className={cn("h-8", u.status === "ARCHIVED" && "opacity-60")}>
                    <TableCell className="font-medium px-2 py-1 text-[11px]">{u.name}</TableCell>
                    <TableCell className="px-2 py-1">
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{u.code}</code>
                    </TableCell>
                    <TableCell className="px-2 py-1">
                      <Badge
                        variant={u.status === "ACTIVE" ? "outline" : "secondary"}
                        className={cn(
                          "h-4 px-1.5 py-0 text-[9px]",
                          u.status === "ACTIVE"
                            ? "text-emerald-700 border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400"
                            : u.status === "ARCHIVED"
                              ? "text-amber-700 border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400"
                              : ""
                        )}
                      >
                        {u.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-[200px] truncate px-2 py-1 text-[11px]">
                      {u.description ?? "—"}
                    </TableCell>
                    <TableCell className="px-2 py-1">
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
          </div>
        </div>
      )}

      <Sheet open={showCreate} onOpenChange={setShowCreate}>
        <SheetContent className="p-0 flex flex-col gap-0 w-full sm:max-w-md">
          <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
            <SheetTitle>New Business Unit</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <BuForm onSubmit={handleCreate} isPending={create.isPending} />
          </div>
          <div className="shrink-0 px-6 py-4 border-t flex items-center justify-end gap-2">
            <SheetClose asChild>
              <Button variant="outline" size="sm">Cancel</Button>
            </SheetClose>
            <Button size="sm" type="submit" form="bu-form" disabled={create.isPending}>
              {create.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={!!editing} onOpenChange={handleEditSheetOpenChange}>
        <SheetContent className="p-0 flex flex-col gap-0 w-full sm:max-w-md">
          <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
            <SheetTitle>Edit Business Unit</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-5">
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
          </div>
          <div className="shrink-0 px-6 py-4 border-t flex items-center justify-end gap-2">
            <SheetClose asChild>
              <Button variant="outline" size="sm">Cancel</Button>
            </SheetClose>
            <Button size="sm" type="submit" form="bu-form" disabled={update.isPending}>
              {update.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
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
