"use client";

import { useState, useCallback, type ChangeEvent } from "react";
import { Archive } from "lucide-react";
import { toast } from "sonner";
import {
  useOrgCostCenters,
  useCreateOrgCostCenter,
  useUpdateOrgCostCenter,
} from "@/hooks/api/org-hierarchy";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { LoadingButton } from "@/components/ui/loading-button";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { PlusIcon } from "@animateicons/react/lucide";
import { Textarea } from "@/components/ui/textarea";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { ErrorState } from "@/components/shared/error-state";
import { CursorPageControls } from "@/components/ui/cursor-page-controls";
import type { OrgCostCenter } from "@/types/org-hierarchy";
import { HierarchyArchiveDialog } from "./hierarchy-archive-dialog";
import { useHierarchyArchive } from "./use-hierarchy-archive";
import { useHierarchyListState } from "./use-hierarchy-list-state";
import { RequireModule } from "@/components/auth/require-module";
import { useCan } from "@/hooks/api/access";
import {
  costCenterFormSchema,
  type CostCenterFormValues,
} from "./cost-center-form-schema";
import { CostCenterActionsCell } from "./cost-center-actions-cell";

function CostCenterForm({
  defaultValues,
  onSubmit,
  isPending: _,
}: {
  defaultValues?: CostCenterFormValues;
  onSubmit: (v: CostCenterFormValues) => void;
  isPending: boolean;
}) {
  const form = useForm<CostCenterFormValues>({
    resolver: zodResolver(costCenterFormSchema),
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

export function OrgCostCentersPage() {
  const {
    page,
    pageSize,
    query,
    search,
    serverSearch,
    showArchived,
    nextPage,
    previousPage,
    setPageSize,
    setSearch,
    setStatus,
    toggleArchived,
  } = useHierarchyListState();
  const {
    data: costCenters,
    isLoading,
    isError,
    error,
    refetch,
  } = useOrgCostCenters(query);
  const create = useCreateOrgCostCenter();
  const update = useUpdateOrgCostCenter();
  const canManage = useCan("settings:organization:manage");

  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<OrgCostCenter | null>(null);
  const archiveFlow = useHierarchyArchive<OrgCostCenter>({
    unitKind: "COST_CENTER",
    archive: (costCenter, callbacks) =>
      update.mutate({ id: costCenter.id, status: "ARCHIVED" }, callbacks),
    successMessage: "Cost center archived",
    onArchived: () => setStatus("ARCHIVED"),
  });

  const displayed = costCenters?.data ?? [];

  const handleCreate = useCallback(
    (values: CostCenterFormValues) => {
      create.mutate(
        {
          code: values.code.toUpperCase(),
          name: values.name,
          description: values.description || undefined,
        },
        {
          onSuccess: () => {
            toast.success("Cost center created");
            setShowCreate(false);
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [create],
  );

  const handleUpdate = useCallback(
    (values: CostCenterFormValues) => {
      if (!editing) return;
      update.mutate(
        {
          id: editing.id,
          code: values.code.toUpperCase(),
          name: values.name,
          description: values.description || undefined,
        },
        {
          onSuccess: () => {
            toast.success("Cost center updated");
            setEditing(null);
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [editing, update],
  );

  const handleRestore = useCallback(
    (c: OrgCostCenter) => {
      update.mutate(
        { id: c.id, status: "ACTIVE" },
        {
          onSuccess: () => {
            toast.success("Cost center restored");
            setStatus("CURRENT");
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [setStatus, update],
  );

  const handleOpenCreate = useCallback(() => setShowCreate(true), []);
  const handleSearchChange = useCallback((v: string) => setSearch(v), [setSearch]);
  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);
  const handleClearSearch = useCallback(() => setSearch(""), [setSearch]);

  function handleEditSheetOpenChange(open: boolean) {
    if (!open) setEditing(null);
  }

  function handleNextPage() {
    nextPage(costCenters?.pageInfo.nextCursor);
  }

  function getRowClassName(c: OrgCostCenter) {
    return cn(c.status === "ARCHIVED" && "opacity-60");
  }

  function getRowKey(c: OrgCostCenter) {
    return c.id;
  }

  function renderCode(c: OrgCostCenter) {
    return <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{c.code}</code>;
  }

  function renderName(c: OrgCostCenter) {
    return <span className="font-medium">{c.name}</span>;
  }

  function renderStatus(c: OrgCostCenter) {
    return (
      <Badge
        variant={c.status === "ACTIVE" ? "outline" : "secondary"}
        className={cn(
          "h-4 px-1.5 py-0 text-micro",
          c.status === "ACTIVE"
            ? "text-status-success-ink border-status-success-rule bg-status-success-surface"
            : c.status === "ARCHIVED"
              ? "text-status-warning-ink border-status-warning-rule bg-status-warning-surface"
              : "",
        )}
      >
        {c.status}
      </Badge>
    );
  }

  function renderDescription(c: OrgCostCenter) {
    return (
      <span className="text-muted-foreground max-w-[200px] truncate block">
        {c.description ?? "—"}
      </span>
    );
  }

  function renderActions(c: OrgCostCenter) {
    if (!canManage) return null;
    return (
      <CostCenterActionsCell
        costCenter={c}
        onEdit={setEditing}
        onArchive={archiveFlow.requestArchive}
        onRestore={handleRestore}
      />
    );
  }

  const columns: DataTableColumn<OrgCostCenter>[] = [
    { key: "code", header: "Code", cell: renderCode },
    { key: "name", header: "Name", cell: renderName },
    { key: "status", header: "Status", cell: renderStatus },
    {
      key: "description",
      header: "Description",
      cell: renderDescription,
      className: "max-w-[200px]",
    },
    { key: "actions", header: "", headerClassName: "w-28", cell: renderActions },
  ];

  const emptyState = showArchived ? (
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
      description={
        serverSearch ? undefined : "Create cost centers to classify payroll, budgets, and expenses for reporting."
      }
      filtersActive={!!serverSearch}
      onClearFilters={handleClearSearch}
      action={
        canManage && !serverSearch ? { label: "Add Cost Center", onClick: handleOpenCreate } : undefined
      }
    />
  );

  return (
    <RequireModule module="hr">
      <PageWrapper
        title="Cost Centers"
        subtitle="Classify payroll, budgets, and expenses for reporting."
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
                Add Cost Center
              </AnimatedIconButton>
            ) : null}
          </div>
        }
        filters={
          <SearchInput
            placeholder="Search cost centers…"
            value={search}
            onValueChange={handleSearchChange}
          />
        }
      >
        {isError ? (
          <ErrorState
            className="flex-1"
            title="Couldn't load cost centers"
            description={getErrorMessage(error)}
            onRetry={handleRetry}
          />
        ) : (
          <DataTable
            data={displayed}
            columns={columns}
            getRowKey={getRowKey}
            isLoading={isLoading}
            emptyState={emptyState}
            rowClassName={getRowClassName}
            minWidth="580px"
            className="flex-1 min-h-0"
            footer={
              page > 1 || costCenters?.pageInfo.hasMore ? (
                <CursorPageControls
                  page={page}
                  hasNext={costCenters?.pageInfo.hasMore ?? false}
                  disabled={isLoading}
                  onPrevious={previousPage}
                  onNext={handleNextPage}
                  pageSize={pageSize}
                  onPageSizeChange={setPageSize}
                />
              ) : undefined
            }
          />
        )}

        <Sheet open={showCreate} onOpenChange={setShowCreate}>
          <SheetContent className="p-0 flex flex-col gap-0 w-full sm:max-w-md">
            <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
              <SheetTitle>New Cost Center</SheetTitle>
            </SheetHeader>
            <SheetBody className="px-6 py-5">
              <CostCenterForm onSubmit={handleCreate} isPending={create.isPending} />
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
                  form="cc-form"
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
              <SheetTitle>Edit Cost Center</SheetTitle>
            </SheetHeader>
            <SheetBody className="px-6 py-5">
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
                  form="cc-form"
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
          unitLabel="cost center"
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
