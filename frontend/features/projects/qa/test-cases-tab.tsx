"use client";

import { useCallback, useMemo, useState } from "react";
import { useTestCases, useTestSuites, useDeleteTestCase } from "@/hooks/api/projects/qa";
import { useCan } from "@/hooks/api/access";
import type { TestCase, TestCasePriority, TestCaseAutomationStatus } from "@/types/projects";
import { DataTable } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { SkeletonTable } from "@/components/shared/skeletons/skeleton-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { MoreHorizontal, Plus } from "lucide-react";
import { toast } from "sonner";
import { TestCaseSheet } from "./test-case-sheet";

const PRIORITY_STYLES: Record<TestCasePriority, string> = {
  low: "text-slate-500 border-slate-200",
  medium: "text-amber-600 border-amber-200",
  high: "text-red-600 border-red-200",
};

const AUTOMATION_STYLES: Record<TestCaseAutomationStatus, string> = {
  manual: "text-slate-500 border-slate-200",
  automated: "text-green-600 border-green-200",
  planned: "text-blue-600 border-blue-200",
};

function priorityLabel(p: TestCasePriority) {
  return p.charAt(0).toUpperCase() + p.slice(1);
}

function automationLabel(a: TestCaseAutomationStatus) {
  return a.charAt(0).toUpperCase() + a.slice(1);
}

interface TestCasesTabProps {
  projectId: number;
}

export function TestCasesTab({ projectId }: TestCasesTabProps) {
  const canManage = useCan("projects:qa:manage");
  const [search, setSearch] = useState("");
  const [suiteFilter, setSuiteFilter] = useState("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editCase, setEditCase] = useState<TestCase | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TestCase | null>(null);

  const filters = {
    q: search || undefined,
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
        onError: () => toast.error("Failed to delete test case"),
      },
    );
  }, [deleteTarget, deleteCase, projectId]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  }, []);

  const handleDeleteDialogChange = useCallback((open: boolean) => {
    if (!open) setDeleteTarget(null);
  }, []);

  const columns = useMemo<DataTableColumn<TestCase>[]>(() => [
    {
      key: "id",
      header: "ID",
      cell: (row) => (
        <span className="text-[11px] font-mono text-muted-foreground">
          TC-{row.caseNumber}
        </span>
      ),
      className: "w-[70px]",
    },
    {
      key: "title",
      header: "Title",
      cell: (row) => <span className="text-[11px] font-medium">{row.title}</span>,
    },
    {
      key: "priority",
      header: "Priority",
      cell: (row) => (
        <Badge variant="outline" className={`text-[10px] ${PRIORITY_STYLES[row.priority]}`}>
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
          className={`text-[10px] ${AUTOMATION_STYLES[row.automationStatus]}`}
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
        <span className="text-[11px] text-muted-foreground">{row.component ?? "—"}</span>
      ),
      className: "w-[120px]",
    },
    {
      key: "actions",
      header: "",
      cell: (row) =>
        canManage ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => handleEdit(row)}>Edit</DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onSelect={() => setDeleteTarget(row)}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null,
      className: "w-[40px]",
    },
  ], [canManage, handleEdit]);

  if (isLoading) return <SkeletonTable rows={8} columns={5} />;
  if (isError) return <ErrorState onRetry={refetch} />;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Input
          placeholder="Search cases..."
          value={search}
          onChange={handleSearchChange}
          className="h-7 text-[11px] w-48"
        />
        <Select value={suiteFilter} onValueChange={setSuiteFilter}>
          <SelectTrigger className="h-7 text-[11px] w-36">
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
        {canManage && (
          <Button size="sm" className="h-7 text-[11px] ml-auto" onClick={handleNewCase}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            New Test Case
          </Button>
        )}
      </div>

      {(cases ?? []).length === 0 ? (
        <EmptyState
          illustrationPreset="ticket"
          title="No test cases"
          description="Create a test case to get started."
          action={canManage ? { label: "New Test Case", onClick: handleNewCase } : undefined}
          compact
        />
      ) : (
        <DataTable<TestCase>
          data={cases ?? []}
          columns={columns}
          getRowKey={(row) => row.id}
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
              TC-{deleteTarget?.caseNumber} will be permanently deleted.
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
