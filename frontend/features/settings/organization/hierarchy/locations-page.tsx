"use client";

import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Pencil, Archive, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import {
  useOrgLocations,
  useCreateOrgLocation,
  useUpdateOrgLocation,
} from "@/hooks/api/org-hierarchy";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { ErrorState } from "@/components/shared/error-state";
import { CursorPageControls } from "@/components/ui/cursor-page-controls";
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
import type { OrgLocation, LocationType } from "@/types/org-hierarchy";
import { HierarchyArchiveDialog } from "./hierarchy-archive-dialog";
import { useHierarchyArchive } from "./use-hierarchy-archive";
import { useHierarchyListState } from "./use-hierarchy-list-state";
import { RequireModule } from "@/components/auth/require-module";
import { useCan } from "@/hooks/api/access";

const LOCATION_TYPE_ENUM = ["OFFICE", "WAREHOUSE", "STORE", "FACTORY", "REMOTE"] as const;

const formSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(100)
    .refine((v) => /[\p{L}\p{N}]/u.test(v), "Name must contain at least one letter or number"),
  type: z.enum(LOCATION_TYPE_ENUM),
  address: z.string().trim().max(500).optional(),
});

type FormValues = z.infer<typeof formSchema>;

function LocationForm({
  defaultValues,
  onSubmit,
  isPending: _,
}: {
  defaultValues?: FormValues;
  onSubmit: (v: FormValues) => void;
  isPending: boolean;
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues ?? { name: "", type: "OFFICE" as const, address: "" },
  });

  return (
    <Form {...form}>
      <form id="location-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Mumbai Office" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {LOCATION_TYPE_ENUM.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t.charAt(0) + t.slice(1).toLowerCase()}
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
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Input placeholder="Full address" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}

function TypeBadge({ type }: { type: LocationType }) {
  const colors: Record<LocationType, string> = {
    OFFICE: "bg-status-info-surface text-status-info-ink border-status-info-rule",
    WAREHOUSE: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
    STORE: "bg-status-info-surface text-status-info-ink border-status-info-rule",
    FACTORY: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
    REMOTE: "bg-status-success-surface text-status-success-ink border-status-success-rule",
  };
  return (
    <Badge variant="outline" className={cn("h-4 px-1.5 py-0 text-micro", colors[type])}>
      {type.charAt(0) + type.slice(1).toLowerCase()}
    </Badge>
  );
}

export function OrgLocationsPage() {
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
    data: locations,
    isLoading,
    isError,
    error,
    refetch,
  } = useOrgLocations(query);
  const create = useCreateOrgLocation();
  const update = useUpdateOrgLocation();
  const canManage = useCan("settings:organization:manage");

  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<OrgLocation | null>(null);
  const archiveFlow = useHierarchyArchive<OrgLocation>({
    unitKind: "LOCATION",
    archive: (location, callbacks) =>
      update.mutate({ id: location.id, status: "ARCHIVED" }, callbacks),
    successMessage: "Location archived",
    onArchived: () => setStatus("ARCHIVED"),
  });

  const displayed = locations?.data ?? [];

  const handleCreate = useCallback(
    (values: FormValues) => {
      create.mutate(
        { name: values.name, type: values.type, address: values.address || undefined },
        {
          onSuccess: () => {
            toast.success("Location created");
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
        { id: editing.id, name: values.name, type: values.type, address: values.address || null },
        {
          onSuccess: () => {
            toast.success("Location updated");
            setEditing(null);
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [editing, update],
  );

  const handleRestore = useCallback(
    (l: OrgLocation) => {
      update.mutate(
        { id: l.id, status: "ACTIVE" },
        {
          onSuccess: () => {
            toast.success("Location restored");
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


  function makeRestoreHandler(loc: OrgLocation) { return () => handleRestore(loc); }
  function makeArchiveHandler(loc: OrgLocation) { return () => archiveFlow.requestArchive(loc); }
  function makeSetEditingHandler(loc: OrgLocation) { return () => setEditing(loc); }
  function handleEditSheetOpenChange(open: boolean) { if (!open) setEditing(null); }

  const columns: DataTableColumn<OrgLocation>[] = [
    {
      key: "name",
      header: "Name",
      cell: (l) => <span className="font-medium">{l.name}</span>,
      sortable: true,
      sortValue: (l) => l.name,
    },
    {
      key: "type",
      header: "Type",
      cell: (l) => <TypeBadge type={l.type} />,
    },
    {
      key: "address",
      header: "Address",
      cell: (l) => (
        <span className="text-muted-foreground max-w-[250px] truncate block">
          {l.address ?? "—"}
        </span>
      ),
      className: "max-w-[250px]",
    },
    {
      key: "status",
      header: "Status",
      cell: (l) => (
        <Badge
          variant={l.status === "ACTIVE" ? "outline" : "secondary"}
          className={cn(
            "h-4 px-1.5 py-0 text-micro",
            l.status === "ACTIVE"
              ? "text-status-success-ink border-status-success-rule bg-status-success-surface"
              : l.status === "ARCHIVED"
                ? "text-status-warning-ink border-status-warning-rule bg-status-warning-surface"
                : "",
          )}
        >
          {l.status}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      headerClassName: "w-28",
      cell: (l) =>
        canManage ? <div className="flex items-center gap-1">
          {l.status === "ARCHIVED" ? (
            <Button variant="ghost" size="sm" onClick={makeRestoreHandler(l)} title="Restore" aria-label="Restore">
              <RotateCcw className="h-4 w-4 text-primary" />
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={makeSetEditingHandler(l)} title="Edit" aria-label="Edit">
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={makeArchiveHandler(l)} title="Archive" aria-label="Archive">
                <Archive className="h-4 w-4 text-muted-foreground" />
              </Button>
            </>
          )}
        </div> : null,
    },
  ];

  const emptyState = showArchived ? (
    <EmptyState
      illustrationPreset="archive"
      title="No archived locations"
      compact
      className="min-h-[200px]"
    />
  ) : (
    <EmptyState
      illustrationPreset="companies"
      title="No locations yet"
      description={serverSearch ? undefined : "Create your first location to get started."}
      filtersActive={!!serverSearch}
      onClearFilters={handleClearSearch}
      action={canManage && !serverSearch ? { label: "Add Location", onClick: handleOpenCreate } : undefined}
    />
  );

  return (
    <RequireModule module="hr">
    <PageWrapper
      title="Locations"
      subtitle="Physical work locations and offices."
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
          {canManage ? <AnimatedIconButton
            icon={PlusIcon}
            iconSize={16}
            iconClassName="mr-1.5"
            size="sm"
            className="flex-1 sm:flex-none"
            onClick={handleOpenCreate}
          >
            Add Location
          </AnimatedIconButton> : null}
        </div>
      }
      filters={
        <SearchInput placeholder="Search locations…" value={search} onValueChange={handleSearchChange} />
      }
    >
      {isError ? (
        <ErrorState
          className="flex-1"
          title="Couldn't load locations"
          description={getErrorMessage(error)}
          onRetry={handleRetry}
        />
      ) : (
        <DataTable
          data={displayed}
          columns={columns}
          getRowKey={(l) => l.id}
          isLoading={isLoading}
          emptyState={emptyState}
          rowClassName={(l) => cn(l.status === "ARCHIVED" && "opacity-60")}
          minWidth="620px"
          className="flex-1 min-h-0"
          footer={
            page > 1 || locations?.pageInfo.hasMore ? (
              <CursorPageControls
                page={page}
                hasNext={locations?.pageInfo.hasMore ?? false}
                disabled={isLoading}
                onPrevious={previousPage}
                onNext={() => nextPage(locations?.pageInfo.nextCursor)}
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
            <SheetTitle>New Location</SheetTitle>
          </SheetHeader>
          <SheetBody className="px-6 py-5">
            {showCreate && (
              <LocationForm onSubmit={handleCreate} isPending={create.isPending} />
            )}
          </SheetBody>
          <div className="shrink-0 px-6 py-4 border-t">
            <div className="grid grid-cols-2 gap-2">
              <SheetClose asChild>
                <Button variant="outline" size="sm" className="w-full">Cancel</Button>
              </SheetClose>
              <LoadingButton size="sm" type="submit" form="location-form" isPending={create.isPending} loadingText="Saving…" className="w-full">Save</LoadingButton>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={!!editing} onOpenChange={handleEditSheetOpenChange}>
        <SheetContent className="p-0 flex flex-col gap-0 w-full sm:max-w-md">
          <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
            <SheetTitle>Edit Location</SheetTitle>
          </SheetHeader>
          <SheetBody className="px-6 py-5">
            {editing && (
              <LocationForm
                defaultValues={{
                  name: editing.name,
                  type: editing.type,
                  address: editing.address ?? "",
                }}
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
              <LoadingButton size="sm" type="submit" form="location-form" isPending={update.isPending} loadingText="Saving…" className="w-full">Save</LoadingButton>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <HierarchyArchiveDialog
        open={!!archiveFlow.target}
        unitName={archiveFlow.target?.name ?? ""}
        unitLabel="location"
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
