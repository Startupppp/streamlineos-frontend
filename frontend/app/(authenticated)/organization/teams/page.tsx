"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { UsersRound, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  useOrgTeams,
  useOrgDepartments,
  useCreateOrgTeam,
  useUpdateOrgTeam,
  useDeleteOrgTeam,
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
import type { OrgTeam } from "@/types/org-hierarchy";

const formSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  code: z
    .string()
    .trim()
    .min(2)
    .max(20)
    .regex(/^[A-Za-z0-9]+$/, "Only alphanumeric characters"),
  departmentId: z.string().optional(),
  description: z.string().trim().max(500).optional(),
  capacity: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

function TeamForm({
  defaultValues,
  departments,
  onSubmit,
  isPending,
}: {
  defaultValues?: Partial<FormValues>;
  departments: { id: string; name: string }[];
  onSubmit: (v: FormValues) => void;
  isPending: boolean;
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", code: "", departmentId: "", description: "", capacity: "", ...defaultValues },
  });

  return (
    <Form {...form}>
      <form id="team-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Frontend Team" {...field} />
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
                    placeholder="FE"
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
            name="capacity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Capacity</FormLabel>
                <FormControl>
                  <Input type="number" min={1} placeholder="Optional" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="departmentId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Department</FormLabel>
              <Select value={field.value ?? ""} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
          <Button type="submit" form="team-form" disabled={isPending}>
            {isPending ? "Saving…" : "Save"}
          </Button>
        </SheetFooter>
      </form>
    </Form>
  );
}

export default function OrgTeamsPage() {
  const { data: teams, isLoading } = useOrgTeams();
  const { data: deptsData } = useOrgDepartments();
  const create = useCreateOrgTeam();
  const update = useUpdateOrgTeam();
  const remove = useDeleteOrgTeam();

  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<OrgTeam | null>(null);
  const [deleting, setDeleting] = useState<OrgTeam | null>(null);

  const departments = (deptsData ?? []).map((d) => ({ id: d.id, name: d.name }));
  const deptMap = Object.fromEntries(departments.map((d) => [d.id, d.name]));
  const active = (teams ?? []).filter((t) => t.status !== "ARCHIVED" && !t.deletedAt);

  function handleCreate(values: FormValues) {
    create.mutate(
      {
        name: values.name,
        code: values.code.toUpperCase(),
        departmentId: values.departmentId || undefined,
        description: values.description || undefined,
        capacity: values.capacity ? Number(values.capacity) : undefined,
      },
      {
        onSuccess: () => {
          toast.success("Team created");
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
        departmentId: values.departmentId || undefined,
        description: values.description || undefined,
        capacity: values.capacity ? Number(values.capacity) : undefined,
      },
      {
        onSuccess: () => {
          toast.success("Team updated");
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
        toast.success("Team deleted");
        setDeleting(null);
      },
      onError: (err) => toast.error(getApiError(err)),
    });
  }

  return (
    <PageWrapper
      title="Teams"
      subtitle="Teams within departments across your organization."
      actions={
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-1.5" />
          Add Team
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
          <UsersRound className="h-10 w-10 opacity-30" />
          <p className="text-sm">No teams yet</p>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            Add Team
          </Button>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Capacity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {active.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.name}</TableCell>
                <TableCell>
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{t.code}</code>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {t.departmentId ? (deptMap[t.departmentId] ?? "—") : "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {t.capacity ?? "—"}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={t.status === "ACTIVE" ? "outline" : "secondary"}
                    className={
                      t.status === "ACTIVE"
                        ? "text-green-700 border-green-200 bg-green-50 dark:bg-green-900/20 dark:text-green-400"
                        : ""
                    }
                  >
                    {t.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setEditing(t)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleting(t)}>
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
            <SheetTitle>New Team</SheetTitle>
          </SheetHeader>
          <TeamForm departments={departments} onSubmit={handleCreate} isPending={create.isPending} />
        </SheetContent>
      </Sheet>

      <Sheet open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Edit Team</SheetTitle>
          </SheetHeader>
          {editing && (
            <TeamForm
              defaultValues={{
                name: editing.name,
                code: editing.code,
                departmentId: editing.departmentId ?? "",
                description: editing.description ?? "",
                capacity: editing.capacity != null ? String(editing.capacity) : "",
              }}
              departments={departments}
              onSubmit={handleUpdate}
              isPending={update.isPending}
            />
          )}
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete Team"
        description={`Are you sure you want to delete "${deleting?.name}"?`}
        onConfirm={handleDelete}
        isPending={remove.isPending}
        destructive
      />
    </PageWrapper>
  );
}
