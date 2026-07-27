"use client";

import { useCallback, useMemo, useState } from "react";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { useTestCases, useTestSuites, useDeleteTestCase } from "@/hooks/api/build/qa";
import { useCan } from "@/hooks/api/access";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import type { TestCase, TestCasePriority, TestCaseAutomationStatus } from "@/types/projects";
import { DataTable } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/ui/search-input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PlusIcon, EllipsisIcon } from "@animateicons/react/lucide";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import { TABLE_TITLE_CELL, TEXT_ONE_LINE } from "@/features/build/shared/text-overflow";
import { TruncatedText } from "@/components/ui/truncated-text";
import { TestCaseSheet } from "./test-case-sheet";

const PRIORITY_STYLES: Record<TestCasePriority, string> = {
  low: "text-muted-foreground border-border",
  medium: "text-amber-600 border-amber-200 dark:text-amber-400 dark:border-amber-500/30",
  high: "text-red-600 border-red-200 dark:text-red-400 dark:border-red-500/30",
};

const AUTOMATION_STYLES: Record<TestCaseAutomationStatus, string> = {
  manual: "text-muted-foreground border-border",
  automated: "text-green-600 border-green-200 dark:text-green-400 dark:border-green-500/30",
  planned: "text-blue-600 border-blue-200 dark:text-blue-400 dark:border-blue-500/30",
};

function priorityLabel(p: TestCasePriority) {
  return p.charAt(0).toUpperCase() + p.slice(1);
}

function automationLabel(a: TestCaseAutomationStatus) {
  return a.charAt(0).toUpperCase() + a.slice(1);
}

function NewCaseButton({ onClick }: { onClick: () => void }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <Button size="sm" className="ml-auto h-7 gap-1 text-[11px]" onClick={onClick} {...hoverHandlers}>
      <PlusIcon ref={iconRef} size={14} />
      New Test Case
    </Button>
  );
}

function CaseActions({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6" aria-label="Case actions" {...hoverHandlers}>
          <EllipsisIcon ref={iconRef} size={14} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={onEdit}>Edit</DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onSelect={onDelete}>
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
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

  const { data: cases, isLoading, isError, refetch } = useTestCases(projectId, filters);
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

  const columns = useMemo<DataTableColumn<TestCase>[]>(() => [
    {
      key: "id",
      header: "ID",
      cell: (row) => (
        <span className="font-mono text-[11px] text-muted-foreground">
          TC-{row.caseNumber}
        </span>
      ),
      className: "w-[70px]",
    },
    {
      key: "title",
      header: "Title",
      className: TABLE_TITLE_CELL,
      cell: (row) => (
        <TruncatedText text={row.title} className="text-[11px] font-medium" />
      ),
    },
    {
      key: "priority",
      header: "Priority",
      cell: (row) => (
        <Badge variant="outline" className={cn("text-[10px]", PRIORITY_STYLES[row.priority])}>
          {priorityLabel(row.priority)}
        </Badge>
      ),
      className: "w-[90px]",
    },
    {
      key: "automationStatus",
      header: "Automation",
      cell: (row) => (
        <Badge
          variant="outline"
          className={cn("text-[10px]", AUTOMATION_STYLES[row.automationStatus])}
        >
          {automationLabel(row.automationStatus)}
        </Badge>
      ),
      className: "w-[100px]",
    },
    {
      key: "component",
      header: "Component",
      cell: (row) => (
        <span className={cn("max-w-[8rem] text-[11px] text-muted-foreground", TEXT_ONE_LINE)}>
          {row.component ?? "—"}
        </span>
      ),
      className: "w-[120px]",
    },
    {
      key: "actions",
      header: "",
      cell: (row) =>
        canManage ? (
          <CaseActions
            onEdit={() => handleEdit(row)}
            onDelete={() => setDeleteTarget(row)}
          />
        ) : null,
      className: "w-[40px]",
    },
  ], [canManage, handleEdit]);

  if (isLoading) return <DataTableSkeleton rows={12} columns={5} className="flex-1" />;
  if (isError) return <ErrorState onRetry={handleRetry} />;

  return (
    <div className="flex min-h-0 flex-1 flex-col space-y-3">
      <div className="flex min-w-0 flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide [&>*]:shrink-0">
        <SearchInput
          placeholder="Search cases..."
          value={search}
          onValueChange={handleSearchChange}
          className="w-48"
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
          description="Create a test case to get started."
          action={canManage ? { label: "New Test Case", onClick: handleNewCase } : undefined}
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

      <AlertDialog open={!!deleteTarget} onOpenChange={handleDeleteDialogChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete test case?</AlertDialogTitle>
            <AlertDialogDescription>
              TC-{deleteTarget?.caseNumber}
              {deleteTarget?.title ? ` · ${deleteTarget.title}` : ""} will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
