"use client";

import { useCallback, useMemo, useState } from "react";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { useTestCases, useTestSuites, useDeleteTestCase } from "@/hooks/api/build/qa";
import { useCan } from "@/hooks/api/access";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import type { TestCase } from "@/types/projects";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PlusIcon } from "@animateicons/react/lucide";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { buildTestCaseColumns } from "./test-case-columns";
import { TestCaseSheet } from "./test-case-sheet";

function NewCaseButton({ onClick }: { onClick: () => void }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <Button size="sm" className="ml-auto h-7 gap-1 text-dense" onClick={onClick} {...hoverHandlers}>
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
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [suiteFilter, setSuiteFilter] = useState("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editCase, setEditCase] = useState<TestCase | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TestCase | null>(null);

  const filters = {
    q: debouncedSearch || undefined,
    suiteId: suiteFilter !== "all" ? Number(suiteFilter) : undefined,
  };

  const { data: cases, isLoading, isError, error, refetch } = useTestCases(projectId, filters);
  const { data: suites } = useTestSuites(projectId);
  const deleteCase = useDeleteTestCase();

  const handleEdit = useCallback((tc: TestCase) => {
    setEditCase(tc);
    setSheetOpen(true);
  }, []);

  const handleNewCase = useCallback(() => {
    setEditCase(null);
    setSheetOpen(true);
  }, []);

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return;
    deleteCase.mutate(
      { projectId, id: deleteTarget.id },
      {
        onSuccess: () => {
          toast.success("Test case deleted");
          setDeleteTarget(null);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }, [deleteTarget, deleteCase, projectId]);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
  }, []);

  const handleDeleteDialogChange = useCallback((open: boolean) => {
    if (!open) setDeleteTarget(null);
  }, []);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const filtersActive = search.trim() !== "" || suiteFilter !== "all";

  const handleClearFilters = useCallback(() => {
    setSearch("");
    setSuiteFilter("all");
  }, []);

  const columns = useMemo(
    () => buildTestCaseColumns({ canManage, onEdit: handleEdit, onDelete: setDeleteTarget }),
    [canManage, handleEdit],
  );

  if (isLoading) return <DataTableSkeleton rows={12} columns={5} className="flex-1" />;
  if (isError)
    return (
      <ErrorState
        className="flex-1"
        title="Couldn't load test cases"
        description={getErrorMessage(error)}
        onRetry={handleRetry}
      />
    );

  return (
    <div className="flex min-h-0 flex-1 flex-col space-y-3">
      <div className="flex min-w-0 flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide [&>*]:shrink-0">
        <SearchInput
          placeholder="Search cases..."
          value={search}
          onValueChange={handleSearchChange}
        />
        <Select value={suiteFilter} onValueChange={setSuiteFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All suites" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All suites</SelectItem>
            {(suites ?? []).map((s) => (
              <SelectItem key={s.id} value={String(s.id)}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {canManage ? <NewCaseButton onClick={handleNewCase} /> : null}
      </div>

      {(cases ?? []).length === 0 ? (
        <EmptyState
          illustrationPreset="ticket"
          title="No test cases"
          description={filtersActive ? undefined : "Create a test case to get started."}
          filtersActive={filtersActive}
          onClearFilters={handleClearFilters}
          action={
            !filtersActive && canManage
              ? { label: "New Test Case", onClick: handleNewCase }
              : undefined
          }
          className="min-h-[32dvh] flex-1"
        />
      ) : (
        <DataTable<TestCase>
          data={cases ?? []}
          columns={columns}
          getRowKey={(row) => row.id}
          className="min-h-0 flex-1"
        />
      )}

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
        onConfirm={handleDelete}
      />
    </div>
  );
}
