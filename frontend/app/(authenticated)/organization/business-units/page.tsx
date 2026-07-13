"use client";

import { useState, useCallback, type ChangeEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, Archive, RotateCcw, Search } from "lucide-react";
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
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import type { OrgBusinessUnit } from "@/types/org-hierarchy";
import { RequireModule } from "@/components/auth/require-module";

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
  isPending: _isPending,
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
      <form id="bu-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
  const handleSearchChange = useCallback((v: string) => setSearch(v), []);

  function handleSearchInputChange(e: ChangeEvent<HTMLInputElement>) { handleSearchChange(e.target.value); }

  function makeRestoreHandler(unit: OrgBusinessUnit) { return () => handleRestore(unit); }
  function makeArchiveHandler(unit: OrgBusinessUnit) { return () => handleArchive(unit); }
  function makeSetEditingHandler(unit: OrgBusinessUnit) { return () => setEditing(unit); }
  function makeSetDeletingHandler(unit: OrgBusinessUnit) { return () => setDeleting(unit); }
  function handleEditSheetOpenChange(open: boolean) { if (!open) setEditing(null); }
  function handleDeleteDialogOpenChange(open: boolean) { if (!open) setDeleting(null); }

  const columns: DataTableColumn<OrgBusinessUnit>[] = [
    {
      key: "name",
      header: "Name",
      cell: (u) => <span className="font-medium">{u.name}</span>,
      sortable: true,
      sortValue: (u) => u.name,
    },
    {
      key: "code",
      header: "Code",
      cell: (u) => (
        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{u.code}</code>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (u) => (
        <Badge
          variant={u.status === "ACTIVE" ? "outline" : "secondary"}
          className={cn(
            "h-4 px-1.5 py-0 text-[9px]",
            u.status === "ACTIVE"
              ? "text-emerald-700 border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400"
              : u.status === "ARCHIVED"
                ? "text-amber-700 border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400"
                : "",
          )}
        >
          {u.status}
        </Badge>
      ),
    },
    {
      key: "description",
      header: "Description",
      cell: (u) => (
        <span className="text-muted-foreground max-w-[200px] truncate block">
          {u.description ?? "—"}
        </span>
      ),
      className: "max-w-[200px]",
    },
    {
      key: "actions",
      header: "",
      headerClassName: "w-28",
      cell: (u) => (
        <div className="flex items-center gap-1">
          {u.status === "ARCHIVED" ? (
            <>
              <Button variant="ghost" size="sm" onClick={makeRestoreHandler(u)} title="Restore">
                <RotateCcw className="h-4 w-4 text-primary" />
              </Button>
              <Button variant="ghost" size="sm" onClick={makeSetDeletingHandler(u)} title="Delete permanently">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={makeSetEditingHandler(u)} title="Edit">
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={makeArchiveHandler(u)} title="Archive">
                <Archive className="h-4 w-4 text-muted-foreground" />
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  const emptyState = search ? (
    <EmptyState
      illustrationPreset="companies"
      title={`No business units matching "${search}"`}
      description="Try a different search term."
      compact
      className="min-h-[200px]"
    />
  ) : showArchived ? (
    <EmptyState
      illustrationPreset="archive"
      title="No archived business units"
      compact
      className="min-h-[200px]"
    />
  ) : (
    <EmptyState
      illustrationPreset="companies"
      title="No business units yet"
      description="Create your first business unit to get started."
      action={{ label: "Add Business Unit", onClick: handleOpenCreate }}
      className="min-h-[40vh]"
    />
  );

  return (
    <RequireModule module="HR">
    <PageWrapper
      title="Business Units"
      subtitle="Top-level divisions of your organization."
      actions={
        <Button size="sm" onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-1.5" />
          Add Business Unit
        </Button>
      }
      filters={
        <>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input className="pl-8 h-8 text-xs max-w-[240px]" placeholder="Search business units…" value={search} onChange={handleSearchInputChange} />
          </div>
          {archived.length > 0 && (
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleToggleArchived}>
              <Archive className="h-4 w-4 mr-1.5" />
              {showArchived ? "Show Active" : `Archived (${archived.length})`}
            </Button>
          )}
        </>
      }
    >
      <DataTable
        data={filtered}
        columns={columns}
        getRowKey={(u) => u.id}
        isLoading={isLoading}
        emptyState={emptyState}
        rowClassName={(u) => cn(u.status === "ARCHIVED" && "opacity-60")}
        minWidth="580px"
      />

      <Sheet open={showCreate} onOpenChange={setShowCreate}>
        <SheetContent className="p-0 flex flex-col gap-0 w-full sm:max-w-md">
          <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
            <SheetTitle>New Business Unit</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <BuForm onSubmit={handleCreate} isPending={create.isPending} />
          </div>
          <div className="shrink-0 px-6 py-4 border-t">
            <div className="grid grid-cols-2 gap-2">
              <SheetClose asChild>
                <Button variant="outline" size="sm" className="w-full">Cancel</Button>
              </SheetClose>
              <Button size="sm" type="submit" form="bu-form" disabled={create.isPending} className="w-full">
                {create.isPending ? "Saving…" : "Save"}
              </Button>
            </div>
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
          <div className="shrink-0 px-6 py-4 border-t">
            <div className="grid grid-cols-2 gap-2">
              <SheetClose asChild>
                <Button variant="outline" size="sm" className="w-full">Cancel</Button>
              </SheetClose>
              <Button size="sm" type="submit" form="bu-form" disabled={update.isPending} className="w-full">
                {update.isPending ? "Saving…" : "Save"}
              </Button>
            </div>
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
    </RequireModule>
  );
}
