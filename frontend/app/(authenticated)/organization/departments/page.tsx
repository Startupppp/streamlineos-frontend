"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Users, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  useOrgDepartments,
  useOrgBranches,
  useCreateOrgDepartment,
  useUpdateOrgDepartment,
  useDeleteOrgDepartment,
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
import type { OrgDepartment } from "@/types/org-hierarchy";

const formSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  code: z
    .string()
    .trim()
    .min(2)
    .max(20)
    .regex(/^[A-Za-z0-9]+$/, "Only alphanumeric characters"),
  branchId: z.string().optional(),
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
    defaultValues: defaultValues ?? { name: "", code: "", branchId: "", description: "" },
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
            render={({ field }) => (
              <FormItem>
                <FormLabel>Code</FormLabel>
                <FormControl>
                  <Input
                    placeholder="ENG"
                    {...field}
                    onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="branchId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Branch</FormLabel>
                <Select value={field.value ?? ""} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
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

  const branches = (branchesData ?? []).map((b) => ({ id: b.id, name: b.name }));
  const branchMap = Object.fromEntries(branches.map((b) => [b.id, b.name]));
  const active = (depts ?? []).filter((d) => d.status !== "ARCHIVED" && !d.deletedAt);

  function handleCreate(values: FormValues) {
    create.mutate(
      {
        name: values.name,
        code: values.code.toUpperCase(),
        branchId: values.branchId || undefined,
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
  }

  function handleUpdate(values: FormValues) {
    if (!editing) return;
    update.mutate(
      {
        id: editing.id,
        name: values.name,
        code: values.code.toUpperCase(),
        branchId: values.branchId || undefined,
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
  }

  function handleDelete() {
    if (!deleting) return;
    remove.mutate(deleting.id, {
      onSuccess: () => {
        toast.success("Department deleted");
        setDeleting(null);
      },
      onError: (err) => toast.error(getApiError(err)),
    });
  }

  return (
    <PageWrapper
      title="Departments"
      subtitle="Functional departments within your organization's branches."
      actions={
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-1.5" />
          Add Department
        </Button>
      }
    >
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-md" />
          ))}
        </div>
      ) : active.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-60 gap-3 text-muted-foreground">
          <Users className="h-10 w-10 opacity-30" />
          <p className="text-sm">No departments yet</p>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            Add Department
          </Button>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {active.map((d) => (
              <TableRow key={d.id}>
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
                        : ""
                    }
                  >
                    {d.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setEditing(d)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleting(d)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
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
            <SheetTitle>New Department</SheetTitle>
          </SheetHeader>
          <DeptForm branches={branches} onSubmit={handleCreate} isPending={create.isPending} />
        </SheetContent>
      </Sheet>

      <Sheet open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Edit Department</SheetTitle>
          </SheetHeader>
          {editing && (
            <DeptForm
              defaultValues={{
                name: editing.name,
                code: editing.code,
                branchId: editing.branchId ?? "",
                description: editing.description ?? "",
              }}
              branches={branches}
              onSubmit={handleUpdate}
              isPending={update.isPending}
            />
          )}
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete Department"
        description={`Are you sure you want to delete "${deleting?.name}"?`}
        onConfirm={handleDelete}
        isPending={remove.isPending}
        destructive
      />
    </PageWrapper>
  );
}
