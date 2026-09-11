"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FILTER_SELECT_TRIGGER, FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { STANDARD_PAGE_SIZE_OPTIONS } from "@/lib/list-pagination";
import { getErrorMessage } from "@/lib/get-error-message";
import { formatShortDate } from "@/lib/date-utils";
import { statusToneClasses } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { useCan } from "@/hooks/api/access";
import {
  useDeleteLandedCostVoucher,
  useLandedCostVouchers,
  type LandedCostStatus,
  type LandedCostVoucherListItem,
} from "@/hooks/api/inventory/landed-cost";
import { LandedCostCreateSheet } from "./landed-cost-create-sheet";
import { LandedCostDetailSheet } from "./landed-cost-detail-sheet";
import { fromMinorUnits } from "./landed-cost-schema";

const ALL = "__all__";

function isLandedCostStatus(value: string): value is LandedCostStatus {
  return value === "DRAFT" || value === "APPLIED";
}

/**
 * Landed cost, which existed only on the backend.
 *
 * Six routes, its own permission key, its own backfill migration, and no way in
 * the product to raise a voucher — so freight and duty never reached a cost
 * layer and every margin was computed off the goods price alone.
 */
export function LandedCostClient() {
  const canView = useCan("inventory:valuation:read");
  const canManage = useCan("inventory:landed-cost:manage");

  const [status, setStatus] = useState<LandedCostStatus | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [creating, setCreating] = useState(false);
  const [inspecting, setInspecting] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<LandedCostVoucherListItem | null>(null);

  const { data, isLoading, isError, error, refetch } = useLandedCostVouchers({
    status,
    page,
    limit: pageSize,
  });
  const remove = useDeleteLandedCostVoucher();

  const rows = useMemo(() => data?.items ?? [], [data]);

  function handleStatusChange(next: string): void {
    setStatus(isLandedCostStatus(next) ? next : undefined);
    setPage(1);
  }

  function handleRetry(): void {
    void refetch();
  }

  function handleDeleteConfirm(): void {
    if (deleting === null) return;
    remove.mutate(deleting.id, {
      onSuccess: () => {
        toast.success(`Voucher ${deleting.voucherNumber} deleted.`);
        setDeleting(null);
      },
      onError: (deleteError) => toast.error(getErrorMessage(deleteError)),
    });
  }

  const columns: DataTableColumn<LandedCostVoucherListItem>[] = useMemo(
    () => [
      {
        key: "voucherNumber",
        header: "Voucher",
        cell: (row) => <span className="text-sm font-medium">{row.voucherNumber}</span>,
      },
      {
        key: "status",
        header: "Status",
        cell: (row) => (
          <span
            className={cn(
              "inline-flex items-center rounded-md border px-2 py-0.5 text-dense font-medium",
              statusToneClasses(row.status === "APPLIED" ? "success" : "neutral"),
            )}
          >
            {row.status === "APPLIED" ? "Applied" : "Draft"}
          </span>
        ),
      },
      {
        key: "allocationBasis",
        header: "Spread by",
        cell: (row) => (
          <Badge variant="outline" className="h-5 px-2 py-0.5 text-dense">
            {row.allocationBasis === "VALUE" ? "Value" : "Quantity"}
          </Badge>
        ),
      },
      {
        key: "chargeTotalCents",
        header: "Charges",
        headerClassName: "text-right",
        className: "text-right font-mono tabular-nums",
        cell: (row) => `${row.currency} ${fromMinorUnits(row.chargeTotalCents)}`,
      },
      {
        key: "capitalisedValue",
        header: "Capitalised",
        headerClassName: "text-right",
        className: "text-right font-mono tabular-nums",
        cell: (row) => row.capitalisedValue ?? "—",
      },
      {
        key: "appliedAt",
        header: "Applied",
        cell: (row) => (
          <span className="text-dense text-muted-foreground">
            {row.appliedAt === null ? "Not applied" : formatShortDate(row.appliedAt)}
          </span>
        ),
      },
      {
        key: "createdAt",
        header: "Raised",
        cell: (row) => (
          <span className="text-dense text-muted-foreground">{formatShortDate(row.createdAt)}</span>
        ),
      },
      {
        key: "actions",
        header: "",
        headerClassName: "w-20",
        className: "w-20",
        cell: (row) =>
          canManage && row.status === "DRAFT" ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7"
              onClick={(event) => {
                event.stopPropagation();
                setDeleting(row);
              }}
            >
              Delete
            </Button>
          ) : null,
      },
    ],
    [canManage],
  );

  if (!canView) {
    return (
      <PageWrapper title="Landed cost">
        <NoPermissionState permission="inventory:valuation:read" className="flex-1" />
      </PageWrapper>
    );
  }

  return (
    <>
      <PageWrapper
        title="Landed cost"
        subtitle="Freight, duty, insurance and handling, landed into the cost of the receipt that brought the goods in."
        noInternalScroll
        className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
        actions={
          canManage ? (
            <AnimatedIconButton
              icon={PlusIcon}
              iconSize={16}
              iconClassName="mr-1.5"
              size="sm"
              className="w-full sm:w-auto"
              onClick={() => setCreating(true)}
            >
              Raise voucher
            </AnimatedIconButton>
          ) : undefined
        }
        filters={
          <div className={FILTER_TOOLBAR_ROW}>
            <Select value={status ?? ALL} onValueChange={handleStatusChange}>
              <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "w-44")} aria-label="Filter by voucher status">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All statuses</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="APPLIED">Applied</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      >
        {isError ? (
          <ErrorState
            className="flex-1"
            title="Couldn't load landed-cost vouchers"
            description={getErrorMessage(error)}
            onRetry={handleRetry}
          />
        ) : (
          <DataTable
            data={rows}
            columns={columns}
            getRowKey={(row) => row.id}
            isLoading={isLoading}
            className="flex-1 min-h-0"
            minWidth="960px"
            onRowClick={(row) => setInspecting(row.id)}
            emptyState={
              status !== undefined ? (
                <InventoryEmptyState
                  illustrationPreset="report"
                  title="No results match your filters"
                  description="No voucher has that status. Clear the filter to see the rest."
                  compact
                />
              ) : (
                <InventoryEmptyState
                  illustrationPreset="report"
                  title="No landed cost has been recorded"
                  description="Freight and duty are not in any cost layer yet, so margin is being computed off the goods price alone."
                  compact
                />
              )
            }
            pagination={{
              mode: "server",
              page,
              pageSize,
              total: data?.total ?? 0,
              onPageChange: setPage,
              onPageSizeChange: setPageSize,
              pageSizeOptions: STANDARD_PAGE_SIZE_OPTIONS,
            }}
          />
        )}
      </PageWrapper>

      <LandedCostCreateSheet open={creating} onOpenChange={setCreating} />
      <LandedCostDetailSheet
        voucherId={inspecting}
        canManage={canManage}
        onOpenChange={(open) => {
          if (!open) setInspecting(null);
        }}
      />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title="Delete this voucher?"
        description={`${deleting?.voucherNumber ?? "This voucher"} has not been applied, so nothing has reached a cost layer and deleting it changes no valuation.`}
        confirmLabel="Delete voucher"
        destructive
        isPending={remove.isPending}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}
