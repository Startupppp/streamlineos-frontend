"use client";

import Link from "next/link";
import { memo } from "react";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SemanticBadge } from "@/components/ui/semantic-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CONTENT_PANEL_SOLID } from "@/components/ui/content-fill-panel";
import { useCan } from "@/hooks/api/access";
import { formatShortDate } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import { useOffboardingChecklists, type OffboardingChecklistRow } from "@/hooks/api/hr/exit";

const ANCHOR_LABELS: Record<OffboardingChecklistRow["anchorKind"], string> = {
  resignation: "Resignation",
  termination: "Termination",
};

interface SummaryRowProps {
  row: OffboardingChecklistRow;
  canManage: boolean;
}

const SummaryRow = memo(function SummaryRow({ row, canManage }: SummaryRowProps) {
  const isResignation = row.anchorKind === "resignation";
  const href = isResignation ? `/hr/exit/${row.anchorId}` : "/hr/termination";
  const linkAllowed = isResignation || canManage;
  const done = row.totalItems - row.openItems;

  return (
    <li className="flex items-center justify-between gap-3 px-3 py-2.5">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">
          {row.employeeDisplayName ?? "Unnamed employee"}
        </p>
        <p className="text-micro text-muted-foreground">
          {ANCHOR_LABELS[row.anchorKind]}
          {row.relevantDate ? ` · ${formatShortDate(row.relevantDate)}` : ""}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="font-mono text-sm tabular-nums text-muted-foreground">
          {done}/{row.totalItems}
        </span>
        <SemanticBadge
          tone={row.openItems > 0 ? "warning" : "success"}
          label={row.openItems > 0 ? `${row.openItems} open` : "Complete"}
        />
        {linkAllowed ? (
          <Button asChild variant="ghost" size="sm" className="gap-1">
            <Link href={href}>
              Open
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        ) : null}
      </div>
    </li>
  );
});

export function OffboardingChecklistSummaryPanel() {
  const { data, isLoading, isError, refetch } = useOffboardingChecklists();
  const canManage = useCan("hr:exit:manage");

  function handleRetry() {
    void refetch();
  }

  if (isLoading) {
    return (
      <div className={cn(CONTENT_PANEL_SOLID, "mb-3 shrink-0 p-3")}>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Offboarding checklists</h2>
        </div>
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className={cn(CONTENT_PANEL_SOLID, "mb-3 shrink-0 p-3")}>
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            Couldn&apos;t load offboarding checklists.
          </p>
          <Button variant="outline" size="sm" onClick={handleRetry}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  if (!data?.length) return null;

  return (
    <div className={cn(CONTENT_PANEL_SOLID, "mb-3 shrink-0 p-3")}>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Offboarding checklists</h2>
        <span className="font-mono text-micro tabular-nums text-muted-foreground">
          {data.length}
        </span>
      </div>
      <ul className="divide-y divide-border rounded-md border bg-muted/40">
        {data.map((row) => (
          <SummaryRow
            key={`${row.anchorKind}-${row.anchorId}`}
            row={row}
            canManage={canManage}
          />
        ))}
      </ul>
    </div>
  );
}
