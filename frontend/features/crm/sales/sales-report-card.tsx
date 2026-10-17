"use client";

import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { NoPermissionState } from "@/components/shared/no-permission-state";
import type { PermissionKey } from "@/lib/rbac/permissions";
import { cn } from "@/lib/utils";

interface ReportQuery {
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => unknown;
  access: { denied: boolean };
}

interface SalesReportCardProps {
  title: string;
  description?: string;
  permission: PermissionKey;
  query: ReportQuery;
  isEmpty: boolean;
  emptyText: string;
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
}

/**
 * One dashboard report in its own panel, with its own states.
 *
 * Each report is a separate read with its own key, so one failing or being
 * denied (cycle length and lost analysis need `crm:deals:read`, the rest
 * `sales:view`) leaves the others on screen.
 */
export function SalesReportCard({
  title,
  description,
  permission,
  query,
  isEmpty,
  emptyText,
  actions,
  className,
  children,
}: SalesReportCardProps) {
  function handleRetry() {
    void query.refetch();
  }

  let body: ReactNode;
  if (query.access.denied) body = <NoPermissionState permission={permission} compact />;
  else if (query.isLoading)
    body = (
      <div className="flex flex-col gap-2" aria-busy="true">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    );
  else if (query.isError)
    body = <ErrorState compact title={`Couldn't load ${title.toLowerCase()}`} error={query.error} onRetry={handleRetry} />;
  else if (isEmpty) body = <p className="text-sm text-muted-foreground">{emptyText}</p>;
  else body = children;

  return (
    <Card className={cn("min-w-0", className)}>
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
          {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
        </div>
        {actions}
      </CardHeader>
      <CardContent className="min-w-0 overflow-x-auto">{body}</CardContent>
    </Card>
  );
}

/** A compact two-plus column table for a report's rows. Report rows are server aggregates, bounded by stage, rep or month. */
export function ReportTable({ headers, children }: { headers: string[]; children: ReactNode }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border text-left text-micro uppercase tracking-wider text-muted-foreground">
          {headers.map((header, index) => (
            <th key={`${index}-${header}`} className={cn("py-1.5 font-semibold", index > 0 && "text-right")}>
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  );
}

export const NUM_CELL = "py-1.5 text-right font-mono tabular-nums";
export const LABEL_CELL = "py-1.5 pr-3";
