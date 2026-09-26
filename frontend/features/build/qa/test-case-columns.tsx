"use client";

import { useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EllipsisIcon } from "@animateicons/react/lucide";
import { TruncatedText } from "@/components/ui/truncated-text";
import type { DataTableColumn } from "@/components/ui/data-table";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { BuildMobileCard } from "@/features/build/shared/build-mobile-card";
import { cn } from "@/lib/utils";
import { TABLE_TITLE_CELL, TEXT_ONE_LINE } from "@/lib/text-overflow";
import type { TestCase } from "@/types/projects";

const PRIORITY_STYLES: Record<string, string> = {
  low: "text-muted-foreground border-border",
  medium: "text-status-warning-ink-strong border-status-warning-rule",
  high: "text-status-danger-ink-strong border-status-danger-rule",
};

const AUTOMATION_STYLES: Record<string, string> = {
  manual: "text-muted-foreground border-border",
  automated: "text-status-success-ink-strong border-status-success-rule",
  planned: "text-status-info-ink-strong border-status-info-rule",
};

function priorityLabel(p: string) {
  return p.charAt(0).toUpperCase() + p.slice(1);
}

function automationLabel(a: string) {
  return a.charAt(0).toUpperCase() + a.slice(1);
}

function PriorityBadge({ priority }: { priority: string }) {
  return (
    <Badge
      variant="outline"
      className={cn("text-micro", PRIORITY_STYLES[priority])}
    >
      {priorityLabel(priority)}
    </Badge>
  );
}

import { TEST_CASE_TABLE_HEADERS } from "./test-case-headers";
export { TEST_CASE_TABLE_HEADERS };

interface TestCaseActionsProps {
  testCase: TestCase;
  onEdit: (tc: TestCase) => void;
  onDelete: (tc: TestCase) => void;
}

export function TestCaseRowActions({
  testCase,
  onEdit,
  onDelete,
}: TestCaseActionsProps) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  const handleEdit = useCallback(() => onEdit(testCase), [testCase, onEdit]);
  const handleDelete = useCallback(
    () => onDelete(testCase),
    [testCase, onDelete],
  );
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          aria-label={`Actions for ${testCase.title}`}
          {...hoverHandlers}
        >
          <EllipsisIcon ref={iconRef} size={14} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={handleEdit}>Edit</DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onSelect={handleDelete}>
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface BuildTestCaseColumnsOptions {
  canManage: boolean;
  onEdit: (testCase: TestCase) => void;
  onDelete: (testCase: TestCase) => void;
}

export function buildTestCaseColumns({
  canManage,
  onEdit,
  onDelete,
}: BuildTestCaseColumnsOptions): DataTableColumn<TestCase>[] {
  return [
    {
      key: "id",
      header: "ID",
      cell: (row) => (
        <span className="font-mono text-dense text-muted-foreground">
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
        <TruncatedText text={row.title} className="text-dense font-medium" />
      ),
    },
    {
      key: "priority",
      header: "Priority",
      cell: (row) => <PriorityBadge priority={row.priority} />,
      className: "w-[90px]",
    },
    {
      key: "automationStatus",
      header: "Automation",
      cell: (row) => (
        <Badge
          variant="outline"
          className={cn("text-micro", AUTOMATION_STYLES[row.automationStatus])}
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
        <span
          className={cn(
            "max-w-[8rem] text-dense text-muted-foreground",
            TEXT_ONE_LINE,
          )}
        >
          {row.component ?? "—"}
        </span>
      ),
      className: "w-[120px]",
    },
    {
      key: "actions",
      header: "Actions",
      headerClassName: "sr-only",
      cell: (row) =>
        canManage ? (
          <TestCaseRowActions testCase={row} onEdit={onEdit} onDelete={onDelete} />
        ) : null,
      className: "w-[40px]",
    },
  ];
}

export function TestCaseMobileCard({
  testCase,
  canManage,
  onEdit,
  onDelete,
}: {
  testCase: TestCase;
  canManage: boolean;
  onEdit: (tc: TestCase) => void;
  onDelete: (tc: TestCase) => void;
}) {
  return (
    <BuildMobileCard
      title={testCase.title}
      status={<PriorityBadge priority={testCase.priority} />}
      meta={[
        {
          label: "Automation",
          value: (
            <Badge
              variant="outline"
              className={cn(
                "text-micro",
                AUTOMATION_STYLES[testCase.automationStatus],
              )}
            >
              {automationLabel(testCase.automationStatus)}
            </Badge>
          ),
        },
        {
          label: "Component",
          value: testCase.component ?? "—",
        },
      ]}
      actions={
        canManage ? (
          <TestCaseRowActions
            testCase={testCase}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ) : null
      }
    />
  );
}
