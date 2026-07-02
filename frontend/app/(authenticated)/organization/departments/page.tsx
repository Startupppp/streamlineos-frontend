"use client";

import { useState, useCallback, type ChangeEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Users, Plus, Pencil, Trash2, Archive, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import {
  useOrgDepartments,
  useOrgBranches,
  useCreateOrgDepartment,
  useUpdateOrgDepartment,
  useDeleteOrgDepartment,
} from "@/hooks/api/org-hierarchy";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { UserCombobox } from "@/components/ui/user-combobox";
import type { OrgDepartment } from "@/types/org-hierarchy";

const NO_BRANCH = "none";

const formSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
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
  isPending,
}: {
  defaultValues?: FormValues;
  branches: { id: string; name: string }[];
  onSubmit: (v: FormValues) => void;
  isPending: boolean;
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues ?? { name: "", code: "", branchId: "", headUserId: "", description: "" },
  });

  return (
    <Form {...form}>
      <form id="dept-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
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
            render={({ field }) => {
              function handleBranchChange(value: string) {
                field.onChange(value === NO_BRANCH ? "" : value);
              }
              return (
              <FormItem>
                <FormLabel>Branch</FormLabel>
                <Select value={field.value ? field.value : NO_BRANCH} onValueChange={handleBranchChange}>
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
              );
            }}
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
        <SheetFooter>
          <Button type="submit" form="dept-form" disabled={isPending}>
            {isPending ? "Saving…" : "Save"}
          </Button>
        </SheetFooter>
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

  const branches = (branchesData?.data ?? []).map((b) => ({ id: b.id, name: b.name }));
  const branchMap = Object.fromEntries(branches.map((b) => [b.id, b.name]));
  const allDepts = depts?.data ?? [];
  const active = allDepts.filter((d) => d.status !== "ARCHIVED" && !d.deletedAt);
  const archived = allDepts.filter((d) => d.status === "ARCHIVED" && !d.deletedAt);
  const displayed = showArchived ? archived : active;

  const handleCreate = useCallback(
    (values: FormValues) => {
      create.mutate(
        {
          name: values.name,
          code: values.code.toUpperCase(),
          branchId: values.branchId || undefined,
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
          branchId: values.branchId || undefined,
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
          onSuccess: () => toast.success("Department archived"),
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
          onSuccess: () => toast.success("Department restored"),
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

  function makeRestoreHandler(dept: OrgDepartment) { return () => handleRestore(dept); }
  function makeArchiveHandler(dept: OrgDepartment) { return () => handleArchive(dept); }
  function makeSetEditingHandler(dept: OrgDepartment) { return () => setEditing(dept); }
  function makeSetDeletingHandler(dept: OrgDepartment) { return () => setDeleting(dept); }
  function handleEditSheetOpenChange(open: boolean) { if (!open) setEditing(null); }
  function handleDeleteDialogOpenChange(open: boolean) { if (!open) setDeleting(null); }

  return (
    <PageWrapper
      title="Departments"
      subtitle="Departments organized within branches across your organization."
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
            Add Department
          </Button>
        </div>
      }
    >
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-md" />
          ))}
        </div>
      ) : displayed.length === 0 ? (
        showArchived ? (
          <div className="flex flex-col items-center justify-center h-60 gap-3 text-muted-foreground">
            <Archive className="h-10 w-10 opacity-30" />
            <p className="text-sm">No archived departments</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-60 gap-3 text-muted-foreground">
            <Users className="h-10 w-10 opacity-30" />
            <p className="text-sm">No departments yet</p>
            <Button size="sm" onClick={handleOpenCreate}>
              <Plus className="h-4 w-4 mr-1.5" />
              Add Department
            </Button>
          </div>
        )
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-28" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayed.map((d) => (
              <TableRow key={d.id} className={d.status === "ARCHIVED" ? "opacity-60" : ""}>
                <TableCell className="font-medium">{d.name}</TableCell>
                <TableCell>
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{d.code}</code>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {d.branchId ? (branchMap[d.branchId] ?? "—") : "—"}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={d.status === "ACTIVE" ? "outline" : "secondary"}
                    className={
                      d.status === "ACTIVE"
                        ? "text-green-700 border-green-200 bg-green-50 dark:bg-green-900/20 dark:text-green-400"
                        : d.status === "ARCHIVED"
                          ? "text-amber-700 border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400"
                          : ""
                    }
                  >
                    {d.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {d.status === "ARCHIVED" ? (
                      <>
                        <Button variant="ghost" size="sm" onClick={makeRestoreHandler(d)} title="Restore">
                          <RotateCcw className="h-4 w-4 text-blue-600" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={makeSetDeletingHandler(d)} title="Delete permanently">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
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
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Sheet open={showCreate} onOpenChange={setShowCreate}>
        <SheetContent className="p-0 flex flex-col gap-0">
          <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
            <SheetTitle>New Department</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <DeptForm branches={branches} onSubmit={handleCreate} isPending={create.isPending} />
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={!!editing} onOpenChange={handleEditSheetOpenChange}>
        <SheetContent className="p-0 flex flex-col gap-0">
          <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
            <SheetTitle>Edit Department</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {editing && (
              <DeptForm
                defaultValues={{
                  name: editing.name,
                  code: editing.code,
                  branchId: editing.branchId ?? "",
                  headUserId: editing.headUserId ?? "",
                  description: editing.description ?? "",
                }}
                branches={branches}
                onSubmit={handleUpdate}
                isPending={update.isPending}
              />
            )}
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
  );
}
