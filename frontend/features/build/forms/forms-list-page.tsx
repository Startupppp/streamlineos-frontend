"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { useCan } from "@/hooks/api/access";
import { useForms, useCreateForm } from "@/hooks/api/build/forms";
import { getErrorMessage } from "@/lib/get-error-message";
import { PmPageShell, PmSection, CONTENT_FILL_PANEL } from "@/components/pm-chrome";
import { FORM_TYPE_LABELS, FORM_TYPES } from "./field-type-meta";
import type { ProjectForm } from "@/types/projects/forms";
import { BuildHeaderActions } from "@/features/build/shared/build-header-actions";
import { BuildListSurface } from "@/features/build/shared/build-list-surface";
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
import { useBuildCursorPager } from "@/features/build/shared/use-build-cursor-pager";

const PAGE_SIZE = 25;

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
  const pager = useBuildCursorPager(listFilters.resetKey);

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
  } = useForms(projectId, {
    type: formTypeValue,
    isActive: isActiveParam,
    q: listFilters.debouncedSearch || undefined,
    cursor: pager.cursor,
    limit: PAGE_SIZE,
  });

  const createForm = useCreateForm(projectId);

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

  const handleNextPage = useCallback(() => {
    pager.goNext(data?.pagination.nextCursor);
  }, [data?.pagination.nextCursor, pager]);

  const items = useMemo(() => data?.data ?? [], [data]);

  const columns = useMemo(() => buildFormsColumns({ projectId }), [projectId]);

  const renderMobileCard = useCallback(
    (row: ProjectForm) => <FormMobileCard form={row} />,
    [],
  );

  return (
    <PageWrapper
      title="Forms"
      subtitle="Build and manage data collection forms for your project"
      filters={
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
      }
      actions={
        canManage ? (
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
      <PmPageShell>
        <PmSection index={0} className="flex min-h-0 flex-1 flex-col">
          <BuildListSurface<ProjectForm>
            permission="build:forms:view"
            rows={items}
            columns={columns}
            isLoading={isLoading}
            isError={isError}
            error={error}
            isFiltered={listFilters.isFiltered}
            getRowKey={(row) => row.id}
            minWidth="680px"
            mobileCard={renderMobileCard}
            loadingHeaders={FORMS_TABLE_HEADERS}
            loadingRows={12}
            pagination={{
              mode: "cursor",
              pageSize: PAGE_SIZE,
              pageNumber: pager.pageNumber,
              hasMore: Boolean(data?.pagination.hasMore),
              hasPrevious: pager.hasPrevious,
              onNext: handleNextPage,
              onPrevious: pager.goPrevious,
            }}
            empty={
              <EmptyState
                className={CONTENT_FILL_PANEL}
                illustrationPreset="documents"
                title="No forms yet"
                description="Create a form to collect structured data from your team or clients."
                action={
                  canManage
                    ? { label: "New Form", onClick: handleNewForm }
                    : undefined
                }
              />
            }
            filteredEmpty={
              <EmptyState
                filtersActive
                className={CONTENT_FILL_PANEL}
                illustrationPreset="documents"
                filteredTitle="No forms match your filters"
                description="Try adjusting the filters to see more forms."
                onClearFilters={listFilters.clearAll}
              />
            }
            onRetry={handleRetry}
          />
        </PmSection>
      </PmPageShell>
    </PageWrapper>
  );
}
