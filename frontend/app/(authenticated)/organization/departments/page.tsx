"use client";

import { useState, useCallback, type ChangeEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Pencil, Archive, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import {
  useOrgDepartments,
  useOrgBranches,
  useCreateOrgDepartment,
  useUpdateOrgDepartment,
  useDeleteOrgDepartment,
} from "@/hooks/api/org-hierarchy";
import { getApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
  SheetBody,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { LoadingButton } from "@/components/ui/loading-button";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { PlusIcon, Trash2Icon } from "@animateicons/react/lucide";
import { Textarea } from "@/components/ui/textarea";
import { UserCombobox } from "@/components/ui/user-combobox";
import type { OrgDepartment } from "@/types/org-hierarchy";
import { RequireModule } from "@/components/auth/require-module";

const NO_BRANCH = "none";

const formSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(100)
    .refine((v) => /[\p{L}\p{N}]/u.test(v), "Name must contain at least one letter or number"),
  code: z
    .string()
    .trim()
    .min(2)
    .max(20)
    .regex(/^[A-Za-z0-9]+$/, "Only alphanumeric characters"),
  branchId: z.string().optional(),
  headUserId: z.string().optional(),
  description: z.string().trim().max(500).optional(),
});

type FormValues = z.infer<typeof formSchema>;

function DeptForm({
  defaultValues,
  branches,
  onSubmit,
  isPending: _,
}: {
  defaultValues?: FormValues;
  branches: { id: string; name: string }[];
  onSubmit: (v: FormValues) => void;
  isPending: boolean;
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues ?? { name: "", code: "", branchId: NO_BRANCH, headUserId: "", description: "" },
  });

  return (
    <Form {...form}>
      <form id="dept-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Engineering" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
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
                    <Input placeholder="ENG" {...field} onChange={handleCodeChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              );
            }}
          />
          <FormField
            control={form.control}
            name="branchId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Branch</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={NO_BRANCH}>None</SelectItem>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="headUserId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Department Head</FormLabel>
              <FormControl>
                <UserCombobox value={field.value ?? ""} onChange={field.onChange} placeholder="Select head…" />
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

export default function OrgDepartmentsPage() {
  const { data: depts, isLoading } = useOrgDepartments();
  const { data: branchesData } = useOrgBranches();
  const create = useCreateOrgDepartment();
  const update = useUpdateOrgDepartment();
  const remove = useDeleteOrgDepartment();

  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<OrgDepartment | null>(null);
  const [deleting, setDeleting] = useState<OrgDepartment | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [search, setSearch] = useState("");

  const branches = (branchesData?.data ?? []).map((b) => ({ id: b.id, name: b.name }));
  const branchMap = Object.fromEntries(branches.map((b) => [b.id, b.name]));
  const allDepts = depts?.data ?? [];
  const active = allDepts.filter((d) => d.status !== "ARCHIVED" && !d.deletedAt);
  const archived = allDepts.filter((d) => d.status === "ARCHIVED" && !d.deletedAt);
  const displayed = showArchived ? archived : active;
  const filtered = search
    ? displayed.filter((d) => {
        const q = search.toLowerCase();
        return (
          d.name.toLowerCase().includes(q) ||
          d.code.toLowerCase().includes(q)
        );
      })
    : displayed;

  const handleCreate = useCallback(
    (values: FormValues) => {
      create.mutate(
        {
          name: values.name,
          code: values.code.toUpperCase(),
          branchId: values.branchId === NO_BRANCH ? undefined : values.branchId,
          headUserId: values.headUserId || undefined,
          description: values.description || undefined,
        },
        {
          onSuccess: () => {
            toast.success("Department created");
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
        {
          id: editing.id,
          name: values.name,
          code: values.code.toUpperCase(),
          branchId: values.branchId === NO_BRANCH ? undefined : values.branchId,
          headUserId: values.headUserId || undefined,
          description: values.description || undefined,
        },
        {
          onSuccess: () => {
            toast.success("Department updated");
            setEditing(null);
          },
          onError: (err) => toast.error(getApiError(err)),
        },
      );
    },
    [editing, update],
  );

  const handleArchive = useCallback(
    (d: OrgDepartment) => {
      update.mutate(
        { id: d.id, status: "ARCHIVED" },
        {
          onSuccess: () => {
            toast.success("Department archived");
            setShowArchived(true);
          },
          onError: (err) => toast.error(getApiError(err)),
        },
      );
    },
    [update],
  );

  const handleRestore = useCallback(
    (d: OrgDepartment) => {
      update.mutate(
        { id: d.id, status: "ACTIVE" },
        {
          onSuccess: () => {
            toast.success("Department restored");
            setShowArchived(false);
          },
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
        toast.success("Department deleted");
        setDeleting(null);
      },
      onError: (err) => toast.error(getApiError(err)),
    });
  }, [deleting, remove]);

  const handleOpenCreate = useCallback(() => setShowCreate(true), []);
  const handleToggleArchived = useCallback(() => setShowArchived((v) => !v), []);
  const handleSearchChange = useCallback((v: string) => setSearch(v), []);

  function handleSearchInputChange(value: string) { handleSearchChange(value); }

  function makeRestoreHandler(dept: OrgDepartment) { return () => handleRestore(dept); }
  function makeArchiveHandler(dept: OrgDepartment) { return () => handleArchive(dept); }
  function makeSetEditingHandler(dept: OrgDepartment) { return () => setEditing(dept); }
  function makeSetDeletingHandler(dept: OrgDepartment) { return () => setDeleting(dept); }
  function handleEditSheetOpenChange(open: boolean) { if (!open) setEditing(null); }
  function handleDeleteDialogOpenChange(open: boolean) { if (!open) setDeleting(null); }

  const columns: DataTableColumn<OrgDepartment>[] = [
    {
      key: "name",
      header: "Name",
      cell: (d) => <span className="font-medium">{d.name}</span>,
      sortable: true,
      sortValue: (d) => d.name,
    },
    {
      key: "code",
      header: "Code",
      cell: (d) => (
        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{d.code}</code>
      ),
    },
    {
      key: "branch",
      header: "Branch",
      cell: (d) => (
        <span className="text-muted-foreground">
          {d.branchId ? (branchMap[d.branchId] ?? "—") : "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (d) => (
        <Badge
          variant={d.status === "ACTIVE" ? "outline" : "secondary"}
          className={cn(
            "h-4 px-1.5 py-0 text-[9px]",
            d.status === "ACTIVE"
              ? "text-emerald-700 border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400"
              : d.status === "ARCHIVED"
                ? "text-amber-700 border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400"
                : "",
          )}
        >
          {d.status}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      headerClassName: "w-28",
      cell: (d) => (
        <div className="flex items-center gap-1">
          {d.status === "ARCHIVED" ? (
            <>
              <Button variant="ghost" size="sm" onClick={makeRestoreHandler(d)} title="Restore">
                <RotateCcw className="h-4 w-4 text-primary" />
              </Button>
              <AnimatedIconButton
                icon={Trash2Icon}
                iconSize={16}
                variant="ghost"
                size="sm"
                onClick={makeSetDeletingHandler(d)}
                title="Delete permanently"
                className="text-destructive"
              />
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={makeSetEditingHandler(d)} title="Edit">
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={makeArchiveHandler(d)} title="Archive">
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
      illustrationPreset="team"
      title={`No departments matching "${search}"`}
      description="Try a different search term."
      compact
      className="min-h-[200px]"
    />
  ) : showArchived ? (
    <EmptyState
      illustrationPreset="archive"
      title="No archived departments"
      compact
      className="min-h-[200px]"
    />
  ) : (
    <EmptyState
      illustrationPreset="team"
      title="No departments yet"
      description="Create your first department to get started."
      action={{ label: "Add Department", onClick: handleOpenCreate }}
    />
  );

  return (
    <RequireModule module="HR">
    <PageWrapper
      title="Departments"
      subtitle="Departments organized within branches."
      actions={
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <Button
            variant={showArchived ? "secondary" : "outline"}
            size="sm"
            className="flex-1 text-xs sm:flex-none"
            onClick={handleToggleArchived}
          >
            <Archive className="h-4 w-4 mr-1.5" />
            {showArchived ? "Show Active" : `Archived (${archived.length})`}
          </Button>
          <AnimatedIconButton
            icon={PlusIcon}
            iconSize={16}
            iconClassName="mr-1.5"
            size="sm"
            className="flex-1 sm:flex-none"
            onClick={handleOpenCreate}
          >
            Add Department
          </AnimatedIconButton>
        </div>
      }
      filters={
        <div className="min-w-0 w-full flex-1 md:min-w-[160px] md:max-w-xs">
          <SearchInput placeholder="Search departments…" value={search} onValueChange={handleSearchInputChange} />
        </div>
      }
    >
      <DataTable
        data={filtered}
        columns={columns}
        getRowKey={(d) => d.id}
        isLoading={isLoading}
        emptyState={emptyState}
        rowClassName={(d) => cn(d.status === "ARCHIVED" && "opacity-60")}
        minWidth="580px"
        className="flex-1 min-h-0"
      />

      <Sheet open={showCreate} onOpenChange={setShowCreate}>
        <SheetContent className="p-0 flex flex-col gap-0 w-full sm:max-w-md">
          <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
            <SheetTitle>New Department</SheetTitle>
          </SheetHeader>
          <SheetBody className="px-6 py-5">
            <DeptForm branches={branches} onSubmit={handleCreate} isPending={create.isPending} />
          </SheetBody>
          <div className="shrink-0 px-6 py-4 border-t">
            <div className="grid grid-cols-2 gap-2">
              <SheetClose asChild>
                <Button variant="outline" size="sm" className="w-full">Cancel</Button>
              </SheetClose>
              <LoadingButton size="sm" type="submit" form="dept-form" isPending={create.isPending} loadingText="Saving…" className="w-full">Save</LoadingButton>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={!!editing} onOpenChange={handleEditSheetOpenChange}>
        <SheetContent className="p-0 flex flex-col gap-0 w-full sm:max-w-md">
          <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
            <SheetTitle>Edit Department</SheetTitle>
          </SheetHeader>
          <SheetBody className="px-6 py-5">
            {editing && (
              <DeptForm
                defaultValues={{
                  name: editing.name,
                  code: editing.code,
                  branchId: editing.branchId ?? NO_BRANCH,
                  headUserId: editing.headUserId ?? "",
                  description: editing.description ?? "",
                }}
                branches={branches}
                onSubmit={handleUpdate}
                isPending={update.isPending}
              />
            )}
          </SheetBody>
          <div className="shrink-0 px-6 py-4 border-t">
            <div className="grid grid-cols-2 gap-2">
              <SheetClose asChild>
                <Button variant="outline" size="sm" className="w-full">Cancel</Button>
              </SheetClose>
              <LoadingButton size="sm" type="submit" form="dept-form" isPending={update.isPending} loadingText="Saving…" className="w-full">Save</LoadingButton>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={handleDeleteDialogOpenChange}
        title="Delete Department"
        description={`Permanently delete "${deleting?.name}"? This cannot be undone.`}
        onConfirm={handleDelete}
        isPending={remove.isPending}
        destructive
      />
    </PageWrapper>
    </RequireModule>
  );
}
