"use client";

import { useState } from "react";
import { PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCan } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import { useOrgDisplay } from "@/hooks/api/org-display";
import { useSalesQuotas } from "@/hooks/api/crm/sales";
import { formatMoneyCompact } from "@/lib/format-utils";
import { formatShortDate } from "@/lib/date-utils";
import { QuotaSheet } from "./quota-sheet";
import { QUOTA_PERIOD_LABELS } from "./quota-form-schema";

const HEADERS = ["Rep", "Period", "Dates", "Target", "Actual", "Attainment"];
const QUOTA_LIMIT = 50;

const PERIOD_LABELS: Readonly<Record<string, string>> = QUOTA_PERIOD_LABELS;

/**
 * Revenue targets per rep. A rep sees their own; a manager sees the team's and
 * may set new ones (`crm:targets:manage`).
 */
export function QuotasPage() {
  const quotas = useSalesQuotas({ limit: QUOTA_LIMIT });
  const canManage = useCan("crm:targets:manage");
  const money = useOrgDisplay();
  const [sheetOpen, setSheetOpen] = useState(false);
  const rows = quotas.data ?? [];

  const pageState = usePageState({
    permission: "crm:targets:view",
    isLoading: quotas.isLoading,
    isError: quotas.isError,
    error: quotas.error,
    isEmpty: quotas.data !== undefined && rows.length === 0,
  });

  function handleCreate() {
    setSheetOpen(true);
  }
  function handleRetry() {
    void quotas.refetch();
  }

  return (
    <PageWrapper
      title="Quotas"
      subtitle={`Revenue targets and attainment, most recent ${QUOTA_LIMIT} first.`}
      state={pageState}
      onRetry={handleRetry}
      loading={<DataTableSkeleton rows={6} headers={HEADERS} className="flex-1" />}
      empty={
        <EmptyState
          title="No quotas yet"
          description="Set a revenue target for a rep and their attainment is tracked against the deals they win."
          action={canManage ? { label: "Set quota", onClick: handleCreate } : undefined}
          className={CONTENT_FILL_PANEL}
        />
      }
      actions={
        canManage ? (
          <AnimatedIconButton icon={PlusIcon} iconSize={16} iconClassName="mr-1.5" size="sm" onClick={handleCreate}>
            Set quota
          </AnimatedIconButton>
        ) : undefined
      }
    >
      <div className="overflow-x-auto">
        <Table className="min-w-[720px]">
          <TableHeader>
            <TableRow>
              {HEADERS.map((header) => (
                <TableHead key={header}>{header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((quota) => (
              <TableRow key={quota.id}>
                <TableCell className="font-medium">{quota.userName ?? "Former member"}</TableCell>
                <TableCell>{PERIOD_LABELS[quota.period] ?? quota.period}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatShortDate(quota.startDate)} – {formatShortDate(quota.endDate)}
                </TableCell>
                <TableCell className="font-mono tabular-nums">{formatMoneyCompact(quota.targetRevenue, money)}</TableCell>
                <TableCell className="font-mono tabular-nums">{formatMoneyCompact(quota.actualRevenue ?? 0, money)}</TableCell>
                <TableCell className="font-mono tabular-nums">{`${quota.attainmentPct}%`}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {canManage ? <QuotaSheet open={sheetOpen} onOpenChange={setSheetOpen} /> : null}
    </PageWrapper>
  );
}
