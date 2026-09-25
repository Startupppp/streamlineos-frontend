"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageState } from "@/components/shared/page-state";
import { useCan } from "@/hooks/api/access";
import { useForms, useCreateForm } from "@/hooks/api/build";
import { getErrorMessage } from "@/lib/get-error-message";
import { usePageState } from "@/hooks/api/use-page-state";
import { PmPageShell, PmSection, PM_FILL_PANEL } from "@/components/pm-chrome";
import { FORM_TYPE_LABELS, FORM_TYPES } from "./field-type-meta";
import type { ProjectForm } from "@/types/projects/forms";
import { BuildHeaderActions } from "@/features/build/shared/build-header-actions";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import {
  BUILD_FILTER_ALL,
  useBuildListFilters,
} from "@/features/build/shared/use-build-list-filters";
import {
  FORMS_TABLE_HEADERS,
  FormMobileCard,
  buildFormsColumns,
} from "./forms-table-columns";

const TYPE_OPTIONS = [
  { value: BUILD_FILTER_ALL, label: "All types" },
  ...FORM_TYPES.map((t) => ({ value: t, label: FORM_TYPE_LABELS[t] })),
];

const ACTIVE_OPTIONS = [
  { value: BUILD_FILTER_ALL, label: "All forms" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const FILTER_DEFINITIONS = [
  { param: "type", options: FORM_TYPES },
  { param: "status", options: ["active", "inactive"] as const },
] as const;

interface FormsListPageProps {
  projectId: number;
}

export function FormsListPage({ projectId }: FormsListPageProps) {
  const router = useRouter();
  const canManage = useCan("build:forms:manage");

  const listFilters = useBuildListFilters({ filters: FILTER_DEFINITIONS });

  const typeValue = listFilters.value("type");
  const statusValue = listFilters.value("status");

  const isActiveParam =
    statusValue === "active"
      ? true
      : statusValue === "inactive"
        ? false
        : undefined;
  const formTypeValue = FORM_TYPES.find((t) => t === typeValue);

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useForms(projectId, {
    type: formTypeValue,
    isActive: isActiveParam,
  });

  const createForm = useCreateForm(projectId);

  const pageState = usePageState({
    permission: "build:forms:view",
    isLoading,
    isError,
    error,
  });

  const isReady = pageState.kind === "ready";

  const handleNewForm = useCallback(() => {
    createForm.mutate(
      { name: "Untitled Form", fields: [], actions: [], isActive: false },
      {
        onSuccess: (form) => {
          toast.success("Form created");
          router.push(`/build/${projectId}/forms/${form.id}`);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [createForm, projectId, router]);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleTypeChange = useCallback(
    (value: string) => listFilters.setValue("type", value),
    [listFilters],
  );

  const handleStatusChange = useCallback(
    (value: string) => listFilters.setValue("status", value),
    [listFilters],
  );

  const search = listFilters.debouncedSearch.trim().toLowerCase();
  const items = Array.isArray(data)
    ? data
    : (data?.pages.flatMap((page) => page.data) ?? []);
  const filtered = useMemo(
    () => items.filter((f) => !search || f.name.toLowerCase().includes(search)),
    [items, search],
  );

  const columns = useMemo(() => buildFormsColumns({ projectId }), [projectId]);

  const renderMobileCard = useCallback(
    (row: ProjectForm) => <FormMobileCard form={row} />,
    [],
  );

  const toolbar = (
    <BuildListToolbar
      search={{
        value: listFilters.search,
        onValueChange: listFilters.setSearch,
        placeholder: "Search forms…",
        label: "Search forms",
      }}
      filters={[
        {
          id: "type",
          label: "Type",
          active: listFilters.isActive("type"),
          control: (
            <BuildFilterSelect
              label="Type"
              value={typeValue}
              onValueChange={handleTypeChange}
              options={TYPE_OPTIONS}
            />
          ),
        },
        {
          id: "status",
          label: "Status",
          active: listFilters.isActive("status"),
          control: (
            <BuildFilterSelect
              label="Status"
              value={statusValue}
              onValueChange={handleStatusChange}
              options={ACTIVE_OPTIONS}
            />
          ),
        },
      ]}
      onClearAll={listFilters.clearAll}
    />
  );

  return (
    <PageWrapper
      title="Forms"
      subtitle="Build and manage data collection forms for your project"
      filters={isReady ? toolbar : undefined}
      actions={
        isReady && canManage ? (
          <BuildHeaderActions
            actions={[
              {
                id: "new-form",
                label: "New form",
                icon: Plus,
                primary: true,
                isPending: createForm.isPending,
                loadingLabel: "Creating…",
                onSelect: handleNewForm,
              },
            ]}
          />
        ) : undefined
      }
    >
      <PageState
        resolution={pageState}
        loading={
          <PmPageShell>
            <PmSection index={0} className="flex min-h-0 flex-1 flex-col">
              <DataTableSkeleton
                mobileCards
                rows={12}
                headers={FORMS_TABLE_HEADERS}
                className="flex-1"
              />
            </PmSection>
          </PmPageShell>
        }
        onRetry={handleRetry}
        className="flex min-h-0 flex-1 flex-col"
      >
        <PmPageShell>
          <PmSection index={0} className="flex min-h-0 flex-1 flex-col">
            {filtered.length === 0 ? (
              <EmptyState
                className={PM_FILL_PANEL}
                illustrationPreset="documents"
                title="No forms yet"
                description={
                  listFilters.isFiltered
                    ? undefined
                    : "Create a form to collect structured data from your team or clients."
                }
                filtersActive={listFilters.isFiltered}
                onClearFilters={listFilters.clearAll}
                action={
                  canManage && !listFilters.isFiltered
                    ? { label: "New Form", onClick: handleNewForm }
                    : undefined
                }
              />
            ) : (
              <DataTable
                data={filtered}
                columns={columns}
                getRowKey={(row) => row.id}
                minWidth="680px"
                className={PM_FILL_PANEL}
                mobileCard={renderMobileCard}
                pagination={{
                  mode: "cursor",
                  pageSize: 25,
                  hasMore: Boolean(hasNextPage),
                  hasPrevious: false,
                  onNext: () => void fetchNextPage(),
                }}
                isLoading={isFetchingNextPage}
              />
            )}
          </PmSection>
        </PmPageShell>
      </PageState>
    </PageWrapper>
  );
}
