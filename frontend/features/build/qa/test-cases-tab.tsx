"use client";

import { useCallback, useMemo, useState } from "react";
import { PlusIcon } from "@animateicons/react/lucide";
import { useTestCases, useTestSuites, useDeleteTestCase } from "@/hooks/api/build/qa";
import { useCan } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageState } from "@/components/shared/page-state";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { useCursorPager } from "@/components/ui/table-pagination";
import type { TestCase } from "@/types/projects";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import {
  BUILD_FILTER_ALL,
  useBuildListFilters,
} from "@/features/build/shared/use-build-list-filters";
import { useBuildListKeyboard } from "@/features/build/shared/use-build-list-keyboard";
import {
  TEST_CASE_TABLE_HEADERS,
  buildTestCaseColumns,
  TestCaseMobileCard,
} from "./test-case-columns";
import { TestCaseSheet } from "./test-case-sheet";

const CASE_PAGE_SIZE = 50;

const FILTER_DEFINITIONS = [{ param: "suite" }] as const;

function NewCaseButton({ onClick }: { onClick: () => void }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <Button onClick={onClick} {...hoverHandlers}>
      <PlusIcon ref={iconRef} size={14} />
      New Test Case
    </Button>
  );
}

interface TestCasesTabProps {
  projectId: number;
}

export function TestCasesTab({ projectId }: TestCasesTabProps) {
  const canManage = useCan("build:qa:manage");
  const listFilters = useBuildListFilters({ filters: FILTER_DEFINITIONS });

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editCase, setEditCase] = useState<TestCase | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TestCase | null>(null);

  const { cursor, hasPrevious, goNext, goPrevious } = useCursorPager(
    listFilters.resetKey,
  );

  const suiteValue = listFilters.value("suite");
  const queryFilters = {
    q: listFilters.debouncedSearch || undefined,
    suiteId: suiteValue !== BUILD_FILTER_ALL ? Number(suiteValue) : undefined,
    cursor: cursor !== undefined ? Number(cursor) : undefined,
  };

  const {
    data: casesPage,
    isLoading,
    isError,
    error,
    refetch,
  } = useTestCases(projectId, queryFilters);
  const cases = casesPage?.data ?? [];
  const { data: suites } = useTestSuites(projectId);
  const deleteCase = useDeleteTestCase();

  const suiteOptions = useMemo(
    () => [
      { value: BUILD_FILTER_ALL, label: "All suites" },
      ...(suites ?? []).map((s) => ({ value: String(s.id), label: s.name })),
    ],
    [suites],
  );

  const handleEdit = useCallback((tc: TestCase) => {
    setEditCase(tc);
    setSheetOpen(true);
  }, []);

  const handleNewCase = useCallback(() => {
    setEditCase(null);
    setSheetOpen(true);
  }, []);

  const handleDeleteRow = useCallback((tc: TestCase) => setDeleteTarget(tc), []);

  const handleDeleteConfirm = useCallback(() => {
    if (!deleteTarget) return;
    deleteCase.mutate(
      { projectId, id: deleteTarget.id },
      {
        onSuccess: () => {
          toast.success("Test case deleted");
          setDeleteTarget(null);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [deleteTarget, deleteCase, projectId]);

  const handleDeleteDialogChange = useCallback((open: boolean) => {
    if (!open) setDeleteTarget(null);
  }, []);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleNextPage = useCallback(() => {
    goNext(casesPage?.nextCursor == null ? null : String(casesPage.nextCursor));
  }, [goNext, casesPage]);

  const handleSuiteChange = useCallback(
    (value: string) => listFilters.setValue("suite", value),
    [listFilters],
  );

  const handleOpenFocused = useCallback(
    (index: number) => { handleEdit(cases[index]); },
    [cases, handleEdit],
  );
  const handleClearKeyboardSelection = useCallback(() => {}, []);
  useBuildListKeyboard({
    itemCount: cases.length,
    onOpen: handleOpenFocused,
    onClearSelection: handleClearKeyboardSelection,
    enabled: !sheetOpen && !deleteTarget,
  });

  const pageState = usePageState({
    permission: "build:qa:view",
    isLoading,
    isError,
    error,
  });

  const columns = useMemo(
    () =>
      buildTestCaseColumns({
        canManage,
        onEdit: handleEdit,
        onDelete: handleDeleteRow,
      }),
    [canManage, handleEdit, handleDeleteRow],
  );

  const renderMobileCard = useCallback(
    (row: TestCase) => (
      <TestCaseMobileCard
        testCase={row}
        canManage={canManage}
        onEdit={handleEdit}
        onDelete={handleDeleteRow}
      />
    ),
    [canManage, handleEdit, handleDeleteRow],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex shrink-0 items-start gap-2">
        <BuildListToolbar
          search={{
            value: listFilters.search,
            onValueChange: listFilters.setSearch,
            placeholder: "Search cases…",
            label: "Search test cases",
          }}
          filters={[
            {
              id: "suite",
              label: "Suite",
              active: listFilters.isActive("suite"),
              control: (
                <BuildFilterSelect
                  label="Suite"
                  value={suiteValue}
                  onValueChange={handleSuiteChange}
                  options={suiteOptions}
                />
              ),
            },
          ]}
          onClearAll={listFilters.clearAll}
          className="flex-1 min-w-0"
        />
        {canManage ? <NewCaseButton onClick={handleNewCase} /> : null}
      </div>

      <PageState
        resolution={pageState}
        loading={
          <DataTableSkeleton mobileCards
            rows={12}
            headers={TEST_CASE_TABLE_HEADERS}
            className="flex-1"
          />
        }
        empty={
          <EmptyState
            illustrationPreset="ticket"
            title="No test cases"
            description="Create a test case to get started."
            filtersActive={listFilters.isFiltered}
            onClearFilters={listFilters.clearAll}
            action={
              canManage
                ? { label: "New Test Case", onClick: handleNewCase }
                : undefined
            }
            className="flex-1"
          />
        }
        onRetry={handleRetry}
        className="flex-1 min-h-0"
      >
        <DataTable<TestCase>
          data={cases}
          columns={columns}
          getRowKey={(row) => row.id}
          mobileCard={renderMobileCard}
          className="flex-1 min-h-0"
          pagination={{
            mode: "cursor",
            pageSize: CASE_PAGE_SIZE,
            hasMore: casesPage?.hasMore ?? false,
            hasPrevious,
            onNext: handleNextPage,
            onPrevious: goPrevious,
          }}
        />
      </PageState>

      <TestCaseSheet
        projectId={projectId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        editCase={editCase}
        suites={suites ?? []}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={handleDeleteDialogChange}
        title="Delete test case?"
        description={`TC-${deleteTarget?.caseNumber ?? ""}${deleteTarget?.title ? ` · ${deleteTarget.title}` : ""} will be permanently deleted.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
