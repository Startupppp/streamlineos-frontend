"use client";

import { useState, useCallback, type ChangeEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, Archive, RotateCcw, Search } from "lucide-react";
import { toast } from "sonner";
import {
  useOrgCostCenters,
  useCreateOrgCostCenter,
  useUpdateOrgCostCenter,
  useDeleteOrgCostCenter,
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
import type { OrgCostCenter } from "@/types/org-hierarchy";
import { RequireModule } from "@/components/auth/require-module";

const formSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2)
    .max(20)
    .regex(/^[A-Za-z0-9]+$/, "Only alphanumeric characters"),
  name: z.string().trim().min(1, "Name is required").max(100),
  description: z.string().trim().max(500).optional(),
});

type FormValues = z.infer<typeof formSchema>;

function CostCenterForm({
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
    defaultValues: defaultValues ?? { code: "", name: "", description: "" },
  });

  return (
    <Form {...form}>
      <form id="cc-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
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
                    <Input placeholder="CC001" {...field} onChange={handleCodeChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              );
            }}
          />
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="Engineering" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea rows={3} placeholder="Optional description…" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}

export default function OrgCostCentersPage() {
  const { data: costCenters, isLoading } = useOrgCostCenters();
  const create = useCreateOrgCostCenter();
  const update = useUpdateOrgCostCenter();
  const remove = useDeleteOrgCostCenter();

  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<OrgCostCenter | null>(null);
  const [deleting, setDeleting] = useState<OrgCostCenter | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [search, setSearch] = useState("");

  const allCostCenters = costCenters ?? [];
  const active = allCostCenters.filter((c) => c.status !== "ARCHIVED");
  const archived = allCostCenters.filter((c) => c.status === "ARCHIVED");
  const displayed = showArchived ? archived : active;
  const filtered = search
    ? displayed.filter((c) => {
        const q = search.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          c.code.toLowerCase().includes(q)
        );
      })
    : displayed;

  const handleCreate = useCallback(
    (values: FormValues) => {
      create.mutate(
        { code: values.code.toUpperCase(), name: values.name, description: values.description || undefined },
        {
          onSuccess: () => {
            toast.success("Cost center created");
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
        { id: editing.id, code: values.code.toUpperCase(), name: values.name, description: values.description || undefined },
        {
          onSuccess: () => {
            toast.success("Cost center updated");
            setEditing(null);
          },
          onError: (err) => toast.error(getApiError(err)),
        },
      );
    },
    [editing, update],
  );

  const handleArchive = useCallback(
    (c: OrgCostCenter) => {
      update.mutate(
        { id: c.id, status: "ARCHIVED" },
        {
          onSuccess: () => toast.success("Cost center archived"),
          onError: (err) => toast.error(getApiError(err)),
        },
      );
    },
    [update],
  );

  const handleRestore = useCallback(
    (c: OrgCostCenter) => {
      update.mutate(
        { id: c.id, status: "ACTIVE" },
        {
          onSuccess: () => toast.success("Cost center restored"),
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
        toast.success("Cost center deleted");
        setDeleting(null);
      },
      onError: (err) => toast.error(getApiError(err)),
    });
  }, [deleting, remove]);

  const handleOpenCreate = useCallback(() => setShowCreate(true), []);
  const handleToggleArchived = useCallback(() => setShowArchived((v) => !v), []);
  const handleSearchChange = useCallback((v: string) => setSearch(v), []);

  function handleSearchInputChange(e: ChangeEvent<HTMLInputElement>) { handleSearchChange(e.target.value); }

  function makeRestoreHandler(cc: OrgCostCenter) { return () => handleRestore(cc); }
  function makeArchiveHandler(cc: OrgCostCenter) { return () => handleArchive(cc); }
  function makeSetEditingHandler(cc: OrgCostCenter) { return () => setEditing(cc); }
  function makeSetDeletingHandler(cc: OrgCostCenter) { return () => setDeleting(cc); }
  function handleEditSheetOpenChange(open: boolean) { if (!open) setEditing(null); }
  function handleDeleteDialogOpenChange(open: boolean) { if (!open) setDeleting(null); }

  const columns: DataTableColumn<OrgCostCenter>[] = [
    {
      key: "code",
      header: "Code",
      cell: (c) => (
        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{c.code}</code>
      ),
    },
    {
      key: "name",
      header: "Name",
      cell: (c) => <span className="font-medium">{c.name}</span>,
      sortable: true,
      sortValue: (c) => c.name,
    },
    {
      key: "status",
      header: "Status",
      cell: (c) => (
        <Badge
          variant={c.status === "ACTIVE" ? "outline" : "secondary"}
          className={cn(
            "h-4 px-1.5 py-0 text-[9px]",
            c.status === "ACTIVE"
              ? "text-emerald-700 border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400"
              : c.status === "ARCHIVED"
                ? "text-amber-700 border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400"
                : "",
          )}
        >
          {c.status}
        </Badge>
      ),
    },
    {
      key: "description",
      header: "Description",
      cell: (c) => (
        <span className="text-muted-foreground max-w-[200px] truncate block">
          {c.description ?? "—"}
        </span>
      ),
      className: "max-w-[200px]",
    },
    {
      key: "actions",
      header: "",
      headerClassName: "w-28",
      cell: (c) => (
        <div className="flex items-center gap-1">
          {c.status === "ARCHIVED" ? (
            <>
              <Button variant="ghost" size="sm" onClick={makeRestoreHandler(c)} title="Restore">
                <RotateCcw className="h-4 w-4 text-primary" />
              </Button>
              <Button variant="ghost" size="sm" onClick={makeSetDeletingHandler(c)} title="Delete permanently">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={makeSetEditingHandler(c)} title="Edit">
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={makeArchiveHandler(c)} title="Archive">
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
      illustrationPreset="payroll"
      title={`No cost centers matching "${search}"`}
      description="Try a different search term."
      compact
      className="min-h-[200px]"
    />
  ) : showArchived ? (
    <EmptyState
      illustrationPreset="archive"
      title="No archived cost centers"
      compact
      className="min-h-[200px]"
    />
  ) : (
    <EmptyState
      illustrationPreset="payroll"
      title="No cost centers yet"
      description="Create your first cost center to get started."
      action={{ label: "Add Cost Center", onClick: handleOpenCreate }}
      className="min-h-[40vh]"
    />
  );

  return (
    <RequireModule module="HR">
    <PageWrapper
      title="Cost Centers"
      subtitle="Cost centers for expense tracking."
      actions={
        <Button size="sm" onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-1.5" />
          Add Cost Center
        </Button>
      }
      filters={
        <>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input className="pl-8 h-8 text-xs max-w-[240px]" placeholder="Search cost centers…" value={search} onChange={handleSearchInputChange} />
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
        getRowKey={(c) => c.id}
        isLoading={isLoading}
        emptyState={emptyState}
        rowClassName={(c) => cn(c.status === "ARCHIVED" && "opacity-60")}
        minWidth="580px"
      />

      <Sheet open={showCreate} onOpenChange={setShowCreate}>
        <SheetContent className="p-0 flex flex-col gap-0 w-full sm:max-w-md">
          <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
            <SheetTitle>New Cost Center</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <CostCenterForm onSubmit={handleCreate} isPending={create.isPending} />
          </div>
          <div className="shrink-0 px-6 py-4 border-t">
            <div className="grid grid-cols-2 gap-2">
              <SheetClose asChild>
                <Button variant="outline" size="sm" className="w-full">Cancel</Button>
              </SheetClose>
              <Button size="sm" type="submit" form="cc-form" disabled={create.isPending} className="w-full">
                {create.isPending ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={!!editing} onOpenChange={handleEditSheetOpenChange}>
        <SheetContent className="p-0 flex flex-col gap-0 w-full sm:max-w-md">
          <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
            <SheetTitle>Edit Cost Center</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {editing && (
              <CostCenterForm
                defaultValues={{
                  code: editing.code,
                  name: editing.name,
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
              <Button size="sm" type="submit" form="cc-form" disabled={update.isPending} className="w-full">
                {update.isPending ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={handleDeleteDialogOpenChange}
        title="Delete Cost Center"
        description={`Permanently delete "${deleting?.name}"? This cannot be undone.`}
        onConfirm={handleDelete}
        isPending={remove.isPending}
        destructive
      />
    </PageWrapper>
    </RequireModule>
  );
}
