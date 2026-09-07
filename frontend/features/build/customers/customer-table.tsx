"use client";

import React, { useMemo } from "react";
import { Globe, Users, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { TruncatedText } from "@/components/ui/truncated-text";
import { cn } from "@/lib/utils";
import { PmPanel } from "@/components/pm-chrome/pm-chrome";
import { TABLE_TITLE_CELL, TEXT_FLEX_CHILD } from "@/lib/text-overflow";
import type { CrmOrganization } from "@/types/crm";
import type { CustomerDisplayPrefs } from "./use-customer-display-prefs";

interface CustomerTableProps {
  customers: CrmOrganization[];
  prefs: CustomerDisplayPrefs;
  hasPrev: boolean;
  hasNext: boolean;
  onPrevPage: () => void;
  onNextPage: () => void;
  isLoading?: boolean;
  emptyState?: React.ReactNode;
}

function healthScoreToStatus(
  score: number | null,
): { label: string; className: string } {
  if (score === null) return { label: "Unknown", className: "bg-muted text-muted-foreground border-border" };
  if (score >= 70)
    return {
      label: "Healthy",
      className:
        "bg-status-success-surface text-status-success-ink border-status-success-rule",
    };
  if (score >= 40)
    return {
      label: "At risk",
      className:
        "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
    };
  return {
    label: "Critical",
    className:
      "bg-status-danger-surface text-status-danger-ink border-status-danger-rule",
  };
}

export const CustomerTable = React.memo(function CustomerTable({
  customers,
  prefs,
  hasPrev,
  hasNext,
  onPrevPage,
  onNextPage,
  isLoading,
  emptyState,
}: CustomerTableProps) {
  const columns = useMemo<DataTableColumn<CrmOrganization>[]>(() => {
    const cols: DataTableColumn<CrmOrganization>[] = [
      {
        key: "name",
        header: "Name",
        sortable: true,
        sortValue: (c) => c.name,
        className: TABLE_TITLE_CELL,
        cell: (c) => (
          <div
            className={cn(
              TEXT_FLEX_CHILD,
              "flex min-w-0 items-center gap-2 overflow-hidden",
            )}
          >
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-micro font-semibold text-primary"
              aria-hidden="true"
            >
              {c.name[0]?.toUpperCase() ?? "?"}
            </span>
            <div className="min-w-0 flex-1">
              <TruncatedText
                text={c.name}
                className="text-label font-medium text-foreground transition-colors group-hover:text-primary"
              />
              {c.industry ? (
                <p className="text-dense text-muted-foreground leading-none mt-0.5 truncate">
                  {c.industry}
                </p>
              ) : null}
            </div>
          </div>
        ),
      },
    ];

    if (prefs.showRequests) {
      cols.push({
        key: "requests",
        header: "Requests",
        className: "w-[100px] hidden sm:table-cell",
        headerClassName: "hidden sm:table-cell",
        cell: (c) =>
          (c.openRequestCount ?? 0) > 0 ? (
            <span className="tabular-nums text-xs text-foreground">{c.openRequestCount}</span>
          ) : (
            <span className="tabular-nums text-xs text-muted-foreground/50">—</span>
          ),
      });
    }

    if (prefs.showAnnualRevenue) {
      cols.push({
        key: "annualRevenue",
        header: "Annual revenue",
        className: "w-[130px] hidden md:table-cell",
        headerClassName: "hidden md:table-cell",
        cell: () => (
          <span className="tabular-nums text-xs text-muted-foreground/50">—</span>
        ),
      });
    }

    if (prefs.showSize) {
      cols.push({
        key: "size",
        header: "Size",
        sortable: true,
        sortValue: (c) => c.size ?? "",
        className: "w-[90px] hidden sm:table-cell",
        headerClassName: "hidden sm:table-cell",
        cell: (c) =>
          c.size ? (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span className="tabular-nums">{c.size}</span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground/40">—</span>
          ),
      });
    }

    if (prefs.showOwner) {
      cols.push({
        key: "owner",
        header: "Owner",
        className: "w-[120px] hidden md:table-cell",
        headerClassName: "hidden md:table-cell",
        cell: () => (
          <span className="text-xs text-muted-foreground/50">—</span>
        ),
      });
    }

    if (prefs.showStatus) {
      cols.push({
        key: "status",
        header: "Status",
        sortable: true,
        sortValue: (c) => c.healthScore ?? -1,
        className: "w-[90px]",
        cell: (c) => {
          const { label, className } = healthScoreToStatus(c.healthScore);
          return (
            <Badge
              variant="outline"
              className={cn(
                "h-5 rounded-full border px-1.5 text-micro font-medium",
                className,
              )}
            >
              {label}
            </Badge>
          );
        },
      });
    }

    if (prefs.showTier) {
      cols.push({
        key: "tier",
        header: "Tier",
        className: "w-[80px] hidden lg:table-cell",
        headerClassName: "hidden lg:table-cell",
        cell: () => (
          <span className="text-xs text-muted-foreground/50">—</span>
        ),
      });
    }

    if (prefs.showDomains) {
      cols.push({
        key: "domain",
        header: "Domain",
        sortable: true,
        sortValue: (c) => c.domain ?? "",
        className: "w-[130px] hidden lg:table-cell",
        headerClassName: "hidden lg:table-cell",
        cell: (c) =>
          c.domain ? (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Globe className="h-3 w-3 shrink-0" aria-hidden="true" />
              <TruncatedText text={c.domain} className="max-w-[96px]" />
            </div>
          ) : (
            <span className="text-xs text-muted-foreground/40">—</span>
          ),
      });
    }

    if (prefs.showDataSource) {
      cols.push({
        key: "dataSource",
        header: "Data source",
        className: "w-[110px] hidden lg:table-cell",
        headerClassName: "hidden lg:table-cell",
        cell: () => (
          <span className="text-xs text-muted-foreground/50">—</span>
        ),
      });
    }

    cols.push({
      key: "website",
      header: "",
      className: "w-[36px] pr-2",
      cell: (c) =>
        c.website ? (
          <a
            href={c.website.startsWith("http") ? c.website : `https://${c.website}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            aria-label={`Visit ${c.name} website`}
            className="flex items-center justify-center text-muted-foreground transition-colors hover:text-primary"
          >
            <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        ) : null,
    });

    return cols;
  }, [prefs]);

  return (
    <PmPanel className="flex min-h-0 flex-1 flex-col">
      <DataTable
        data={customers}
        columns={columns}
        getRowKey={(c) => c.id}
        isLoading={isLoading}
        rowClassName={() => "group h-10 hover:bg-primary/[0.035]"}
        className="min-h-0 flex-1 rounded-none border-0 bg-transparent shadow-none"
        emptyState={emptyState}
        minWidth="480px"
      />
      {(hasPrev || hasNext) ? (
        <div className="flex shrink-0 items-center justify-end gap-2 border-t px-2 py-2">
          <Button variant="outline" size="sm" disabled={!hasPrev} onClick={onPrevPage}>
            Previous
          </Button>
          <Button variant="outline" size="sm" disabled={!hasNext} onClick={onNextPage}>
            Next
          </Button>
        </div>
      ) : null}
    </PmPanel>
  );
});
