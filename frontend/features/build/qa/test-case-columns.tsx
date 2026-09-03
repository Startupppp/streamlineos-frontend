"use client";

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
import { cn } from "@/lib/utils";
import { TABLE_TITLE_CELL, TEXT_ONE_LINE } from "@/lib/text-overflow";
import type { TestCase, TestCasePriority, TestCaseAutomationStatus } from "@/types/projects";

const PRIORITY_STYLES: Record<TestCasePriority, string> = {
  low: "text-muted-foreground border-border",
  medium: "text-status-warning-ink border-status-warning-rule",
  high: "text-status-danger-ink border-status-danger-rule",
};

const AUTOMATION_STYLES: Record<TestCaseAutomationStatus, string> = {
  manual: "text-muted-foreground border-border",
  automated: "text-status-success-ink border-status-success-rule",
  planned: "text-status-info-ink border-status-info-rule",
};

function priorityLabel(p: TestCasePriority) {
  return p.charAt(0).toUpperCase() + p.slice(1);
}

function automationLabel(a: TestCaseAutomationStatus) {
  return a.charAt(0).toUpperCase() + a.slice(1);
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
      cell: (row) => (
        <Badge variant="outline" className={cn("text-micro", PRIORITY_STYLES[row.priority])}>
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
        <span className={cn("max-w-[8rem] text-dense text-muted-foreground", TEXT_ONE_LINE)}>
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
            onEdit={() => onEdit(row)}
            onDelete={() => onDelete(row)}
          />
        ) : null,
      className: "w-[40px]",
    },
  ];
}
