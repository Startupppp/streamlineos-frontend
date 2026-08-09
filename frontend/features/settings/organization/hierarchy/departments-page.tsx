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
} from "@/hooks/api/org-hierarchy";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { ErrorState } from "@/components/shared/error-state";
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
import type { OrgDepartment } from "@/types/org-hierarchy";
import { RequireModule } from "@/components/auth/require-module";
import { HierarchyArchiveDialog } from "./hierarchy-archive-dialog";
import { isAssignableHierarchyParent } from "./hierarchy-option";
import { useHierarchyArchive } from "./use-hierarchy-archive";
import { STANDARD_PAGE_SIZE_OPTIONS } from "@/lib/list-pagination";
import {
  useHierarchyListState,
  useHierarchyPageBounds,
} from "./use-hierarchy-list-state";
import { useCan } from "@/hooks/api/access";

const NO_BRANCH = "none";

const formSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(100)
    .refine(
      (v) => /[\p{L}\p{N}]/u.test(v),
      "Name must contain at least one letter or number",
    ),
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
    defaultValues: defaultValues ?? {
      name: "",
      code: "",
      branchId: NO_BRANCH,
      headUserId: "",
      description: "",
    },
  });

  return (
    <Form {...form}>
      <form
        id="dept-form"
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4"
      >
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
                    <Input
                      placeholder="ENG"
                      {...field}
                      onChange={handleCodeChange}
                    />
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
                <UserCombobox
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  placeholder="Select head…"
                />
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
                <Textarea
                  rows={3}
                  placeholder="Optional description…"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}

export function OrgDepartmentsPage() {
  const {
    page,
    pageSize,
    query,
    search,
    serverSearch,
    showArchived,
    setPage,
    setPageSize,
    setSearch,
    setStatus,
    toggleArchived,
  } = useHierarchyListState();
  const {
    data: depts,
    isLoading,
    isError,
    error,
    refetch,
  } = useOrgDepartments(query);
  const isCorrectingPage = useHierarchyPageBounds({
    page,
    pageSize,
    total: isError ? undefined : depts?.total,
    setPage,
  });
  const { data: branchesData } = useOrgBranches({
    page: 1,
    limit: 100,
    status: "ACTIVE",
  });
  const { data: membersData } = useOrgMembers(1, 100);
  const create = useCreateOrgDepartment();
  const update = useUpdateOrgDepartment();
  const canManage = useCan("settings:organization:manage");

  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<OrgDepartment | null>(null);
  const archiveFlow = useHierarchyArchive<OrgDepartment>({
    unitKind: "DEPARTMENT",
    archive: (department, callbacks) =>
      update.mutate({ id: department.id, status: "ARCHIVED" }, callbacks),
    successMessage: "Department archived",
    onArchived: () => setStatus("ARCHIVED"),
  });

  const branches = (branchesData?.data ?? [])
    .filter(isAssignableHierarchyParent)
    .map((branch) => ({ id: branch.id, name: branch.name }));
  const branchMap = Object.fromEntries(branches.map((b) => [b.id, b.name]));
  const memberMap = Object.fromEntries(
    (membersData?.data ?? []).map((m) => [m.userId, m.name ?? m.email]),
  );
  const displayed = depts?.data ?? [];

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
          branchId: values.branchId === NO_BRANCH ? null : values.branchId,
          headUserId: values.headUserId || null,
          description: values.description || null,
        },
        {
          onSuccess: () => {
            toast.success("Department updated");
            setEditing(null);
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [editing, update],
  );

  const handleRestore = useCallback(
    (d: OrgDepartment) => {
      update.mutate(
        { id: d.id, status: "ACTIVE" },
        {
          onSuccess: () => {
            toast.success("Department restored");
            setStatus("CURRENT");
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [setStatus, update],
  );

  const handleOpenCreate = useCallback(() => setShowCreate(true), []);
  const handleSearchChange = useCallback(
    (v: string) => setSearch(v),
    [setSearch],
  );
  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  function handleSearchInputChange(value: string) {
    handleSearchChange(value);
  }

  function makeRestoreHandler(dept: OrgDepartment) {
    return () => handleRestore(dept);
  }
  function makeArchiveHandler(dept: OrgDepartment) {
    return () => archiveFlow.requestArchive(dept);
  }
  function makeSetEditingHandler(dept: OrgDepartment) {
    return () => setEditing(dept);
  }
  function handleEditSheetOpenChange(open: boolean) {
    if (!open) setEditing(null);
  }

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
      key: "head",
      header: "Head",
      cell: (d) => (
        <span className="text-muted-foreground">
          {d.headUserId ? (memberMap[d.headUserId] ?? "—") : "—"}
        </span>
      ),
    },
    {
      key: "description",
      header: "Description",
      cell: (d) => (
        <span className="text-muted-foreground truncate block max-w-[200px]">
          {d.description ?? "—"}
        </span>
      ),
      className: "max-w-[200px]",
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
      cell: (d) =>
        canManage ? (
          <div className="flex items-center gap-1">
            {d.status === "ARCHIVED" ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={makeRestoreHandler(d)}
                title="Restore"
              >
                <RotateCcw className="h-4 w-4 text-primary" />
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={makeSetEditingHandler(d)}
                  title="Edit"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={makeArchiveHandler(d)}
                  title="Archive"
                >
                  <Archive className="h-4 w-4 text-muted-foreground" />
                </Button>
              </>
            )}
          </div>
        ) : null,
    },
  ];

  const emptyState = serverSearch ? (
    <EmptyState
      illustrationPreset="team"
      title={`No departments matching "${serverSearch}"`}
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
      action={
        canManage
          ? { label: "Add Department", onClick: handleOpenCreate }
          : undefined
      }
    />
  );

  return (
    <RequireModule module="hr">
      <PageWrapper
        title="Departments"
        subtitle="Departments organized within branches."
        actions={
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Button
              variant={showArchived ? "secondary" : "outline"}
              size="sm"
              className="flex-1 text-xs sm:flex-none"
              onClick={toggleArchived}
            >
              <Archive className="h-4 w-4 mr-1.5" />
              {showArchived ? "Show current" : "View archived"}
            </Button>
            {canManage ? (
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
            ) : null}
          </div>
        }
        filters={
          <SearchInput
            placeholder="Search departments…"
            value={search}
            onValueChange={handleSearchInputChange}
          />
        }
      >
        {isError ? (
          <ErrorState
            className="flex-1"
            title="Couldn't load departments"
            description={getErrorMessage(error)}
            onRetry={handleRetry}
          />
        ) : (
          <DataTable
            data={displayed}
            columns={columns}
            getRowKey={(d) => d.id}
            isLoading={isLoading || isCorrectingPage}
            emptyState={emptyState}
            rowClassName={(d) => cn(d.status === "ARCHIVED" && "opacity-60")}
            minWidth="820px"
            className="flex-1 min-h-0"
            pagination={{
              mode: "server",
              page,
              pageSize,
              total: depts?.total ?? 0,
              onPageChange: setPage,
              onPageSizeChange: setPageSize,
              pageSizeOptions: STANDARD_PAGE_SIZE_OPTIONS,
            }}
          />
        )}

        <Sheet open={showCreate} onOpenChange={setShowCreate}>
          <SheetContent className="p-0 flex flex-col gap-0 w-full sm:max-w-md">
            <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
              <SheetTitle>New Department</SheetTitle>
            </SheetHeader>
            <SheetBody className="px-6 py-5">
              {showCreate && (
                <DeptForm
                  branches={branches}
                  onSubmit={handleCreate}
                  isPending={create.isPending}
                />
              )}
            </SheetBody>
            <div className="shrink-0 px-6 py-4 border-t">
              <div className="grid grid-cols-2 gap-2">
                <SheetClose asChild>
                  <Button variant="outline" size="sm" className="w-full">
                    Cancel
                  </Button>
                </SheetClose>
                <LoadingButton
                  size="sm"
                  type="submit"
                  form="dept-form"
                  isPending={create.isPending}
                  loadingText="Saving…"
                  className="w-full"
                >
                  Save
                </LoadingButton>
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
                  <Button variant="outline" size="sm" className="w-full">
                    Cancel
                  </Button>
                </SheetClose>
                <LoadingButton
                  size="sm"
                  type="submit"
                  form="dept-form"
                  isPending={update.isPending}
                  loadingText="Saving…"
                  className="w-full"
                >
                  Save
                </LoadingButton>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        <HierarchyArchiveDialog
          open={!!archiveFlow.target}
          unitName={archiveFlow.target?.name ?? ""}
          unitLabel="department"
          isPending={update.isPending}
          error={archiveFlow.error}
          preflightError={archiveFlow.preflightError}
          dependencies={archiveFlow.dependencies}
          isChecking={archiveFlow.isChecking}
          onRetryPreflight={archiveFlow.retryPreflight}
          onConfirm={archiveFlow.confirmArchive}
          onOpenChange={archiveFlow.handleOpenChange}
        />
      </PageWrapper>
    </RequireModule>
  );
}
