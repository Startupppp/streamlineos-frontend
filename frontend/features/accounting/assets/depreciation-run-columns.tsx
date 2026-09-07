"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type { DataTableColumn } from "@/components/ui/data-table";
import { Money } from "@/features/accounting/shared";
import { formatShortDate } from "@/lib/date-utils";
import type { DepreciationRun } from "@/types/accounting/assets";
import { RunStatusBadge } from "./depreciation-run-status-badge";
import { ReverseDepreciationRunButton } from "./reverse-depreciation-run-button";

export function depreciationRunColumns(
  canManage: boolean,
): DataTableColumn<DepreciationRun>[] {
  return [
    {
      key: "periodKey",
      header: "Period",
      cell: (run) => (
        <span className="font-mono text-xs font-medium">{run.periodKey}</span>
      ),
    },
    {
      key: "totalAmount",
      header: "Total Depr.",
      className: "text-right",
      headerClassName: "text-right",
      cell: (run) => <Money value={parseFloat(run.totalAmount)} />,
    },
    {
      key: "status",
      header: "Status",
      cell: (run) => <RunStatusBadge status={run.status} />,
    },
    {
      key: "journalEntryId",
      header: "Journal",
      className: "hidden md:table-cell",
      headerClassName: "hidden md:table-cell",
      cell: (run) =>
        run.journalEntryId ? (
          <Link
            href={`/accounting/journal/${run.journalEntryId}`}
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            JE-{run.journalEntryId}
            <ExternalLink className="h-3 w-3" />
          </Link>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      key: "createdBy",
      header: "Created By",
      className: "hidden lg:table-cell text-muted-foreground",
      headerClassName: "hidden lg:table-cell",
      cell: (run) => run.createdBy,
    },
    {
      key: "postedAt",
      header: "Posted At",
      className: "hidden lg:table-cell text-muted-foreground",
      headerClassName: "hidden lg:table-cell",
      cell: (run) => formatShortDate(run.postedAt),
    },
    {
      key: "actions",
      header: "",
      className: "w-28 text-right",
      cell: (run) => (
        <ReverseDepreciationRunButton run={run} canManage={canManage} />
      ),
    },
  ];
}
