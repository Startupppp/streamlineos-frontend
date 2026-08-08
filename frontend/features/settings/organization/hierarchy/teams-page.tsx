"use client";

import {
  useState,
  useCallback,
  useEffect,
  useTransition,
  type ChangeEvent,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Pencil, Archive, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import {
  useOrgTeams,
  useOrgDepartments,
  useCreateOrgTeam,
  useUpdateOrgTeam,
} from "@/hooks/api/org-hierarchy";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { PlusIcon } from "@animateicons/react/lucide";
import { Textarea } from "@/components/ui/textarea";
import { UserCombobox } from "@/components/ui/user-combobox";
import { useOrgMembers } from "@/hooks/api/organization";
import type { OrgTeam } from "@/types/org-hierarchy";
import { RequireModule } from "@/components/auth/require-module";
import { ErrorState } from "@/components/shared/error-state";
import { useCan } from "@/hooks/api/access";
import { HierarchyArchiveDialog } from "./hierarchy-archive-dialog";
import { isAssignableHierarchyParent } from "./hierarchy-option";
import { useHierarchyArchive } from "./use-hierarchy-archive";
import { useDebouncedValue } from "@/hooks/common/use-debounce";

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
    .min(2, "At least 2 characters")
    .max(20, "Max 20 characters")
    .regex(/^[A-Za-z0-9]+$/, "Letters and numbers only"),
  departmentId: z.string().min(1, "Department is required"),
  leadUserId: z.string().optional(),
  description: z.string().trim().max(500).optional(),
  capacity: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

function TeamForm({
  defaultValues,
  departments,
  onSubmit,
  isPending: _,
}: {
  defaultValues?: Partial<FormValues>;
  departments: { id: string; name: string }[];
  onSubmit: (v: FormValues) => void;
  isPending: boolean;
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    reValidateMode: "onChange",
    defaultValues: { name: "", code: "", departmentId: "", leadUserId: "", description: "", capacity: "", ...defaultValues },
  });

  return (
    <Form {...form}>
      <form id="team-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
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
        <div className="grid grid-cols-2 items-start gap-3">
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => {
              function handleCodeChange(e: ChangeEvent<HTMLInputElement>) {
                field.onChange(e.target.value.toUpperCase());
              }
              return (
                <FormItem className="min-w-0">
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
              <FormItem className="min-w-0">
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
                      <SelectValue placeholder="Select a department" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
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

export function OrgTeamsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const query = searchParams.get("search") ?? "";
  const showArchived = searchParams.get("status") === "archived";
  const requestedPage = Number(searchParams.get("page") ?? "1");
  const page =
    Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<OrgTeam | null>(null);
  const [search, setSearch] = useState(query);
  const debouncedSearch = useDebouncedValue(search, 300);
  const { data: teams, isLoading, isError, error, refetch } = useOrgTeams({
    page,
    limit: 20,
    search: query || undefined,
    status: showArchived ? "ARCHIVED" : "ACTIVE",
  });
  const { data: deptsData } = useOrgDepartments();
  const create = useCreateOrgTeam();
  const update = useUpdateOrgTeam();
  const canManage = useCan("settings:organization:manage");

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null) params.delete(key);
        else params.set(key, value);
      }
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [pathname, router, searchParams],
  );
  const archiveFlow = useHierarchyArchive<OrgTeam>({
    archive: (team, callbacks) =>
      update.mutate({ id: team.id, status: "ARCHIVED" }, callbacks),
    successMessage: "Team archived",
    onArchived: () => updateParams({ status: "archived", page: null }),
  });

  useEffect(() => {
    if (debouncedSearch === query) return;
    updateParams({ search: debouncedSearch || null, page: null });
  }, [debouncedSearch, query, updateParams]);

  const { data: membersData } = useOrgMembers(1, 100);
  const departments = (deptsData?.data ?? [])
    .filter(isAssignableHierarchyParent)
    .map((department) => ({ id: department.id, name: department.name }));
  const deptMap = Object.fromEntries(departments.map((d) => [d.id, d.name]));
  const memberMap = Object.fromEntries(
    (membersData?.data ?? []).map((m) => [m.userId, m.name ?? m.email]),
  );
  const displayedTeams = teams?.data ?? [];

  const handleCreate = useCallback(
    (values: FormValues) => {
      create.mutate(
        {
          name: values.name,
          code: values.code.toUpperCase(),
          departmentId: values.departmentId,
          leadUserId: values.leadUserId || undefined,
          description: values.description || undefined,
          capacity: values.capacity ? Number(values.capacity) : undefined,
        },
        {
          onSuccess: () => {
            toast.success("Team created");
            setShowCreate(false);
          },
          onError: (err) => toast.error(getErrorMessage(err)),
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
          departmentId: values.departmentId,
          leadUserId: values.leadUserId || null,
          description: values.description || null,
          capacity: values.capacity ? Number(values.capacity) : null,
        },
        {
          onSuccess: () => {
            toast.success("Team updated");
            setEditing(null);
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [editing, update],
  );

  const handleRestore = useCallback(
    (t: OrgTeam) => {
      update.mutate(
        { id: t.id, status: "ACTIVE" },
        {
          onSuccess: () => {
            toast.success("Team restored");
            updateParams({ status: null, page: null });
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [update, updateParams],
  );

  const handleOpenCreate = useCallback(() => setShowCreate(true), []);
  const handleToggleArchived = useCallback(() => {
    updateParams({ status: showArchived ? null : "archived", page: null });
  }, [showArchived, updateParams]);
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
  }, []);
  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);
  const handlePageChange = useCallback(
    (nextPage: number) =>
      updateParams({ page: nextPage <= 1 ? null : String(nextPage) }),
    [updateParams],
  );

  function handleSearchInputChange(value: string) { handleSearchChange(value); }

  function makeRestoreHandler(team: OrgTeam) { return () => handleRestore(team); }
  function makeArchiveHandler(team: OrgTeam) { return () => archiveFlow.requestArchive(team); }
  function makeSetEditingHandler(team: OrgTeam) { return () => setEditing(team); }
  function handleEditSheetOpenChange(open: boolean) { if (!open) setEditing(null); }

  const columns: DataTableColumn<OrgTeam>[] = [
    {
      key: "name",
      header: "Name",
      cell: (t) => <span className="font-medium">{t.name}</span>,
      sortable: true,
      sortValue: (t) => t.name,
    },
    {
      key: "code",
      header: "Code",
      cell: (t) => (
        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{t.code}</code>
      ),
    },
    {
      key: "department",
      header: "Department",
      cell: (t) => (
        <span className="text-muted-foreground">
          {t.departmentId ? (deptMap[t.departmentId] ?? "—") : "—"}
        </span>
      ),
    },
    {
      key: "lead",
      header: "Team Lead",
      cell: (t) => (
        <span className="text-muted-foreground">
          {t.leadUserId ? (memberMap[t.leadUserId] ?? "—") : "—"}
        </span>
      ),
    },
    {
      key: "description",
      header: "Description",
      cell: (t) => (
        <span className="text-muted-foreground truncate block max-w-[180px]">
          {t.description ?? "—"}
        </span>
      ),
      className: "max-w-[180px]",
    },
    {
      key: "capacity",
      header: "Capacity",
      cell: (t) => (
        <span className="text-muted-foreground tabular-nums">
          {t.capacity ?? "—"}
        </span>
      ),
      className: "tabular-nums",
    },
    {
      key: "status",
      header: "Status",
      cell: (t) => (
        <Badge
          variant={t.status === "ACTIVE" ? "outline" : "secondary"}
          className={cn(
            "h-4 px-1.5 py-0 text-[9px]",
            t.status === "ACTIVE"
              ? "text-emerald-700 border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400"
              : t.status === "ARCHIVED"
                ? "text-amber-700 border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400"
                : "",
          )}
        >
          {t.status}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      headerClassName: "w-28",
      cell: (t) => (
        canManage ? <div className="flex items-center gap-1">
          {t.status === "ARCHIVED" ? (
            <Button variant="ghost" size="sm" onClick={makeRestoreHandler(t)} title="Restore">
              <RotateCcw className="h-4 w-4 text-primary" />
            </Button>
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
        </div> : null
      ),
    },
  ];

  const emptyState = search ? (
    <EmptyState
      illustrationPreset="team"
      title={`No teams matching "${search}"`}
      description="Try a different search term."
      compact
      className="min-h-[200px]"
    />
  ) : showArchived ? (
    <EmptyState
      illustrationPreset="archive"
      title="No archived teams"
      compact
      className="min-h-[200px]"
    />
  ) : (
    <EmptyState
      illustrationPreset="team"
      title="No teams yet"
      description="Create your first team to get started."
      action={canManage ? { label: "Add Team", onClick: handleOpenCreate } : undefined}
    />
  );

  return (
    <RequireModule module="hr">
    <PageWrapper
      title="Teams"
      subtitle="Teams within departments."
      actions={
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <Button
            variant={showArchived ? "secondary" : "outline"}
            size="sm"
            className="flex-1 text-xs sm:flex-none"
            onClick={handleToggleArchived}
          >
            <Archive className="h-4 w-4 mr-1.5" />
            {showArchived ? "Show Active" : "View archived"}
          </Button>
          {canManage ? <AnimatedIconButton
            icon={PlusIcon}
            iconSize={16}
            iconClassName="mr-1.5"
            size="sm"
            className="flex-1 sm:flex-none"
            onClick={handleOpenCreate}
          >
            Add Team
          </AnimatedIconButton> : null}
        </div>
      }
      filters={
        <SearchInput placeholder="Search teams…" value={search} onValueChange={handleSearchInputChange} />
      }
    >
      {isError ? (
        <ErrorState
          className="flex-1"
          title="Couldn't load teams"
          description={getErrorMessage(error)}
          onRetry={handleRetry}
        />
      ) : (
        <DataTable
          data={displayedTeams}
          columns={columns}
          getRowKey={(t) => t.id}
          isLoading={isLoading}
          emptyState={emptyState}
          rowClassName={(t) => cn(t.status === "ARCHIVED" && "opacity-60")}
          minWidth="900px"
          className="flex-1 min-h-0"
          pagination={{
            mode: "server",
            page,
            pageSize: 20,
            total: teams?.total ?? 0,
            onPageChange: handlePageChange,
          }}
        />
      )}

      <Sheet open={showCreate} onOpenChange={setShowCreate}>
        <SheetContent className="p-0 flex flex-col gap-0 w-full sm:max-w-md">
          <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
            <SheetTitle>New Team</SheetTitle>
          </SheetHeader>
          <SheetBody className="px-6 py-5">
            {showCreate && (
              <TeamForm departments={departments} onSubmit={handleCreate} isPending={create.isPending} />
            )}
          </SheetBody>
          <div className="shrink-0 px-6 py-4 border-t">
            <div className="grid grid-cols-2 gap-2">
              <SheetClose asChild>
                <Button variant="outline" size="sm" className="w-full">Cancel</Button>
              </SheetClose>
              <LoadingButton size="sm" type="submit" form="team-form" isPending={create.isPending} loadingText="Saving…" className="w-full">Save</LoadingButton>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={!!editing} onOpenChange={handleEditSheetOpenChange}>
        <SheetContent className="p-0 flex flex-col gap-0 w-full sm:max-w-md">
          <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
            <SheetTitle>Edit Team</SheetTitle>
          </SheetHeader>
          <SheetBody className="px-6 py-5">
            {editing && (
              <TeamForm
                defaultValues={{
                  name: editing.name,
                  code: editing.code,
                  departmentId: editing.departmentId ?? "",
                  leadUserId: editing.leadUserId ?? "",
                  description: editing.description ?? "",
                  capacity: editing.capacity != null ? String(editing.capacity) : "",
                }}
                departments={departments}
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
              <LoadingButton size="sm" type="submit" form="team-form" isPending={update.isPending} loadingText="Saving…" className="w-full">Save</LoadingButton>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <HierarchyArchiveDialog
        open={!!archiveFlow.target}
        unitName={archiveFlow.target?.name ?? ""}
        unitLabel="team"
        isPending={update.isPending}
        error={archiveFlow.error}
        onConfirm={archiveFlow.confirmArchive}
        onOpenChange={archiveFlow.handleOpenChange}
      />
    </PageWrapper>
    </RequireModule>
  );
}
