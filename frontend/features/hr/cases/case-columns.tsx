"use client";

import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { TruncatedText } from "@/components/ui/truncated-text";
import { TABLE_TITLE_CELL } from "@/lib/text-overflow";
import type { DataTableColumn } from "@/components/ui/data-table";
import type { HrCase } from "@/hooks/api/hr/cases";
import { CaseStatusBadge, CaseSeverityBadge, CaseCategoryLabel } from "./case-badges";

export const CASE_COLUMNS: DataTableColumn<HrCase>[] = [
  {
    key: "caseNumber",
    header: "Case #",
    cell: (row) => (
      <span className="font-mono text-xs font-medium text-primary">{row.caseNumber}</span>
    ),
  },
  {
    key: "category",
    header: "Category",
    cell: (row) => <CaseCategoryLabel category={row.category} />,
  },
  {
    key: "severity",
    header: "Severity",
    cell: (row) => <CaseSeverityBadge severity={row.severity} />,
  },
  {
    key: "status",
    header: "Status",
    cell: (row) => <CaseStatusBadge status={row.status} />,
  },
  {
    key: "summary",
    header: "Summary",
    className: TABLE_TITLE_CELL,
    cell: (row) => (
      <div className="flex min-w-0 items-center gap-2 overflow-hidden">
        <TruncatedText text={row.summary} className="text-sm" />
        {row.anonymous && (
          <Badge variant="outline" className="text-xs text-muted-foreground shrink-0">Anon</Badge>
        )}
      </div>
    ),
  },
  {
    key: "age",
    header: "Age",
    cell: (row) => (
      <span className="text-xs text-muted-foreground">
        {formatDistanceToNow(new Date(row.createdAt), { addSuffix: true })}
      </span>
    ),
  },
];
