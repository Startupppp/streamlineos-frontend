"use client";

import { useState, useCallback, type ChangeEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { UsersRound, Plus, Pencil, Trash2, Archive, RotateCcw, Search } from "lucide-react";
import { toast } from "sonner";
import {
  useOrgTeams,
  useOrgDepartments,
  useCreateOrgTeam,
  useUpdateOrgTeam,
  useDeleteOrgTeam,
} from "@/hooks/api/org-hierarchy";
import { getApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SkeletonTable } from "@/components/shared/skeletons/skeleton-table";
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
import type { OrgTeam } from "@/types/org-hierarchy";

const NO_DEPARTMENT = "none";

const formSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  code: z
    .string()
    .trim()
    .min(2)
    .max(20)
    .regex(/^[A-Za-z0-9]+$/, "Only alphanumeric characters"),
  departmentId: z.string().optional(),
  leadUserId: z.string().optional(),
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
    defaultValues: { name: "", code: "", departmentId: NO_DEPARTMENT, leadUserId: "", description: "", capacity: "", ...defaultValues },
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
            render={({ field }) => {
              function handleCodeChange(e: ChangeEvent<HTMLInputElement>) {
                field.onChange(e.target.value.toUpperCase());
              }
              return (
                <FormItem>
                  <FormLabel>Code</FormLabel>
                  <FormControl>
                    <Input placeholder="FE" {...field} onChange={handleCodeChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              );
            }}
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
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={NO_DEPARTMENT}>None</SelectItem>
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
          name="leadUserId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Team Lead</FormLabel>
              <FormControl>
                <UserCombobox value={field.value ?? ""} onChange={field.onChange} placeholder="Select team lead…" />
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

export default function OrgTeamsPage() {
  const { data: teams, isLoading } = useOrgTeams();
  const { data: deptsData } = useOrgDepartments();
  const create = useCreateOrgTeam();
  const update = useUpdateOrgTeam();
  const remove = useDeleteOrgTeam();

  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<OrgTeam | null>(null);
  const [deleting, setDeleting] = useState<OrgTeam | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [search, setSearch] = useState("");

  const departments = (deptsData?.data ?? []).map((d) => ({ id: d.id, name: d.name }));
  const deptMap = Object.fromEntries(departments.map((d) => [d.id, d.name]));
  const allTeams = teams?.data ?? [];
  const active = allTeams.filter((t) => t.status !== "ARCHIVED" && !t.deletedAt);
  const archived = allTeams.filter((t) => t.status === "ARCHIVED" && !t.deletedAt);
  const displayed = showArchived ? archived : active;
  const filtered = search
    ? displayed.filter((t) => {
        const q = search.toLowerCase();
        return (
          t.name.toLowerCase().includes(q) ||
          t.code.toLowerCase().includes(q)
        );
      })
    : displayed;

  const handleCreate = useCallback(
    (values: FormValues) => {
      create.mutate(
        {
          name: values.name,
          code: values.code.toUpperCase(),
          departmentId: values.departmentId === NO_DEPARTMENT ? undefined : values.departmentId,
          leadUserId: values.leadUserId || undefined,
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
          departmentId: values.departmentId === NO_DEPARTMENT ? undefined : values.departmentId,
          leadUserId: values.leadUserId || undefined,
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
    },
    [editing, update],
  );

  const handleArchive = useCallback(
    (t: OrgTeam) => {
      update.mutate(
        { id: t.id, status: "ARCHIVED" },
        {
          onSuccess: () => toast.success("Team archived"),
          onError: (err) => toast.error(getApiError(err)),
        },
      );
    },
    [update],
  );

  const handleRestore = useCallback(
    (t: OrgTeam) => {
      update.mutate(
        { id: t.id, status: "ACTIVE" },
        {
          onSuccess: () => toast.success("Team restored"),
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
        toast.success("Team deleted");
        setDeleting(null);
      },
      onError: (err) => toast.error(getApiError(err)),
    });
  }, [deleting, remove]);

  const handleOpenCreate = useCallback(() => setShowCreate(true), []);
  const handleToggleArchived = useCallback(() => setShowArchived((v) => !v), []);
  const handleSearchChange = useCallback((e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value), []);

  function makeRestoreHandler(team: OrgTeam) { return () => handleRestore(team); }
  function makeArchiveHandler(team: OrgTeam) { return () => handleArchive(team); }
  function makeSetEditingHandler(team: OrgTeam) { return () => setEditing(team); }
  function makeSetDeletingHandler(team: OrgTeam) { return () => setDeleting(team); }
  function handleEditSheetOpenChange(open: boolean) { if (!open) setEditing(null); }
  function handleDeleteDialogOpenChange(open: boolean) { if (!open) setDeleting(null); }

  return (
    <PageWrapper
      title="Teams"
      subtitle="Teams within departments across your organization."
      actions={
        <Button size="sm" onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-1.5" />
          Add Team
        </Button>
      }
      filters={
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search teams…"
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
        <SkeletonTable rows={5} columns={6} />
      ) : filtered.length === 0 ? (
        search ? (
          <EmptyState
            illustration={<UsersRound className="h-8 w-8 text-muted-foreground/40" />}
            title={`No teams matching "${search}"`}
            description="Try a different search term."
            compact
            className="min-h-[200px]"
          />
        ) : showArchived ? (
          <EmptyState
            illustration={<Archive className="h-8 w-8 text-muted-foreground/40" />}
            title="No archived teams"
            compact
            className="min-h-[200px]"
          />
        ) : (
          <EmptyState
            illustration={<UsersRound className="h-8 w-8 text-muted-foreground/40" />}
            title="No teams yet"
            description="Create your first team to get started."
            action={{ label: "Add Team", onClick: handleOpenCreate }}
            className="min-h-[40vh]"
          />
        )
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[620px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Name</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Code</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Department</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Capacity</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Status</TableHead>
                  <TableHead className="w-28 px-2 py-1.5" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((t) => (
                  <TableRow key={t.id} className={cn("h-8", t.status === "ARCHIVED" && "opacity-60")}>
                    <TableCell className="font-medium px-2 py-1 text-[11px]">{t.name}</TableCell>
                    <TableCell className="px-2 py-1">
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{t.code}</code>
                    </TableCell>
                    <TableCell className="text-muted-foreground px-2 py-1 text-[11px]">
                      {t.departmentId ? (deptMap[t.departmentId] ?? "—") : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground px-2 py-1 text-[11px] tabular-nums">
                      {t.capacity ?? "—"}
                    </TableCell>
                    <TableCell className="px-2 py-1">
                      <Badge
                        variant={t.status === "ACTIVE" ? "outline" : "secondary"}
                        className={cn(
                          "h-4 px-1.5 py-0 text-[9px]",
                          t.status === "ACTIVE"
                            ? "text-emerald-700 border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400"
                            : t.status === "ARCHIVED"
                              ? "text-amber-700 border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400"
                              : ""
                        )}
                      >
                        {t.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-2 py-1">
                      <div className="flex items-center gap-1">
                        {t.status === "ARCHIVED" ? (
                          <>
                            <Button variant="ghost" size="sm" onClick={makeRestoreHandler(t)} title="Restore">
                              <RotateCcw className="h-4 w-4 text-blue-600" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={makeSetDeletingHandler(t)} title="Delete permanently">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button variant="ghost" size="sm" onClick={makeSetEditingHandler(t)} title="Edit">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={makeArchiveHandler(t)} title="Archive">
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
            <SheetTitle>New Team</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <TeamForm departments={departments} onSubmit={handleCreate} isPending={create.isPending} />
          </div>
          <div className="shrink-0 px-6 py-4 border-t flex items-center justify-end gap-2">
            <SheetClose asChild>
              <Button variant="outline" size="sm">Cancel</Button>
            </SheetClose>
            <Button size="sm" type="submit" form="team-form" disabled={create.isPending}>
              {create.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={!!editing} onOpenChange={handleEditSheetOpenChange}>
        <SheetContent className="p-0 flex flex-col gap-0 w-full sm:max-w-md">
          <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
            <SheetTitle>Edit Team</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {editing && (
              <TeamForm
                defaultValues={{
                  name: editing.name,
                  code: editing.code,
                  departmentId: editing.departmentId ?? NO_DEPARTMENT,
                  leadUserId: editing.leadUserId ?? "",
                  description: editing.description ?? "",
                  capacity: editing.capacity != null ? String(editing.capacity) : "",
                }}
                departments={departments}
                onSubmit={handleUpdate}
                isPending={update.isPending}
              />
            )}
          </div>
          <div className="shrink-0 px-6 py-4 border-t flex items-center justify-end gap-2">
            <SheetClose asChild>
              <Button variant="outline" size="sm">Cancel</Button>
            </SheetClose>
            <Button size="sm" type="submit" form="team-form" disabled={update.isPending}>
              {update.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={handleDeleteDialogOpenChange}
        title="Delete Team"
        description={`Permanently delete "${deleting?.name}"? This cannot be undone.`}
        onConfirm={handleDelete}
        isPending={remove.isPending}
        destructive
      />
    </PageWrapper>
  );
}
