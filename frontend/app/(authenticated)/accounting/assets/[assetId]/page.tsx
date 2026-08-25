"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
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
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { LoadingState, ErrorState } from "@/components/shared";
import { EntityFormDialog } from "@/components/shared/entity-form-dialog";
import { Money } from "@/features/accounting/shared";
import { EditAssetSheet } from "@/features/accounting/assets/edit-asset-sheet";
import { useCan } from "@/hooks/api/access";
import {
  useAsset,
  useActivateAsset,
  useDisposeAsset,
  useAssetCategories,
} from "@/hooks/api/accounting/assets";
import { getErrorMessage } from "@/lib/get-error-message";
import type { DepreciationScheduleRow } from "@/types/accounting/assets";

const ASSET_STATUS_CLASSES: Record<string, string> = {
  DRAFT: "bg-primary/5 text-foreground border-primary/20",
  ACTIVE: "bg-status-success-surface text-status-success-ink border-status-success-rule",
  FULLY_DEPRECIATED: "bg-muted text-foreground border-border",
  DISPOSED: "bg-status-danger-surface text-status-danger-ink border-status-danger-rule",
};

const ASSET_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  FULLY_DEPRECIATED: "Fully Depreciated",
  DISPOSED: "Disposed",
};

const disposeAssetSchema = z.object({
  disposalDate: z.string().min(1, "Date is required"),
  amount: z.string().min(1, "Proceeds amount is required"),
});

type DisposeFormValues = z.infer<typeof disposeAssetSchema>;

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString();
}

function ScheduleStatusBadge({ status }: { status: DepreciationScheduleRow["status"] }) {
  const cls = status === "POSTED"
    ? "bg-status-success-surface text-status-success-ink border-status-success-rule"
    : "bg-primary/5 text-foreground border-primary/20";
  return (
    <Badge variant="outline" className={`text-micro px-1.5 py-0 h-4 ${cls}`}>
      {status === "POSTED" ? "Posted" : "Scheduled"}
    </Badge>
  );
}

const scheduleColumns: DataTableColumn<DepreciationScheduleRow>[] = [
  {
    key: "period",
    header: "Period",
    cell: (row) => <span className="font-mono text-xs">{row.periodKey}</span>,
  },
  {
    key: "amount",
    header: "Amount",
    headerClassName: "text-right",
    className: "text-right",
    cell: (row) => <Money value={parseFloat(row.amount)} />,
  },
  {
    key: "status",
    header: "Status",
    cell: (row) => <ScheduleStatusBadge status={row.status} />,
  },
  {
    key: "journal",
    header: "Journal",
    cell: (row) =>
      row.journalEntryId !== undefined ? (
        <Link
          href={`/accounting/journal/${row.journalEntryId}`}
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          JE-{row.journalEntryId}
          <ExternalLink className="h-3 w-3" />
        </Link>
      ) : (
        <span className="text-xs text-muted-foreground">—</span>
      ),
  },
];

export default function AssetDetailPage() {
  const params = useParams();
  const assetId = parseInt(String(params.assetId), 10);

  const canUpdate = useCan("accounting:assets:update");
  const canManage = useCan("accounting:assets:manage");

  const { data: asset, isLoading, error, refetch } = useAsset(assetId);
  const categoriesQuery = useAssetCategories({ pageSize: 100 });
  const categories = categoriesQuery.data?.items ?? [];

  const activateMutation = useActivateAsset(assetId);
  const disposeMutation = useDisposeAsset(assetId);

  const [editOpen, setEditOpen] = useState(false);
  const [disposeOpen, setDisposeOpen] = useState(false);
  const [activateConfirmOpen, setActivateConfirmOpen] = useState(false);

  function handleRetry(): void {
    void refetch();
  }

  function handleActivateConfirm(): void {
    activateMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success("Asset activated");
        setActivateConfirmOpen(false);
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  function handleActivateDialogChange(open: boolean): void {
    if (!activateMutation.isPending) setActivateConfirmOpen(open);
  }

  function handleDispose(values: DisposeFormValues): void {
    disposeMutation.mutate(
      { disposalDate: values.disposalDate, amount: values.amount },
      {
        onSuccess: () => {
          toast.success("Asset disposed");
          setDisposeOpen(false);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  if (isLoading) {
    return (
      <PageWrapper title="Asset" backHref="/accounting/assets">
        <LoadingState variant="page" />
      </PageWrapper>
    );
  }

  if (error || !asset) {
    return (
      <PageWrapper title="Asset" backHref="/accounting/assets">
        <ErrorState
          title="Failed to load asset"
          description={error ? getErrorMessage(error) : "Asset not found"}
          onRetry={handleRetry}
        />
      </PageWrapper>
    );
  }

  const acquisitionCost = parseFloat(asset.acquisitionCost);
  const accumulatedDepr = parseFloat(asset.accumulatedDepreciation);
  const salvageValue = parseFloat(asset.salvageValue);
  const bookValue = Math.max(0, acquisitionCost - accumulatedDepr);
  const monthlyDepr = asset.usefulLifeMonths > 0
    ? (acquisitionCost - salvageValue) / asset.usefulLifeMonths
    : 0;

  const categoryName = categories.find((c) => c.id === asset.categoryId)?.name ?? "—";

  return (
    <>
      <PageWrapper
        title={asset.name}
        subtitle={`${asset.assetNumber} · ${categoryName}`}
        backHref="/accounting/assets"
        badge={
          <Badge variant="outline" className={`text-micro px-1.5 py-0.5 ${ASSET_STATUS_CLASSES[asset.status] ?? ""}`}>
            {ASSET_STATUS_LABELS[asset.status] ?? asset.status}
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2">
            {asset.status === "DRAFT" && canUpdate && (
              <>
                <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
                  Edit
                </Button>
                <Button size="sm" onClick={() => setActivateConfirmOpen(true)}>
                  Activate
                </Button>
              </>
            )}
            {asset.status === "ACTIVE" && canManage && (
              <Button size="sm" variant="destructive" onClick={() => setDisposeOpen(true)}>
                Dispose
              </Button>
            )}
          </div>
        }
      >
        <div className="space-y-6">
          <StatCardGrid cols={4}>
            <StatCard
              label="Acquisition Cost"
              value={`₹${acquisitionCost.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`}
              tone="blue"
            />
            <StatCard
              label="Accumulated Depr."
              value={`₹${accumulatedDepr.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`}
              tone="amber"
            />
            <StatCard
              label="Book Value"
              value={`₹${bookValue.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`}
              tone="emerald"
            />
            <StatCard
              label="Est. Monthly Depr."
              value={`₹${monthlyDepr.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`}
              tone="default"
            />
          </StatCardGrid>

          <div>
            <h2 className="text-sm font-semibold text-foreground mb-3">Asset Details</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 rounded-lg border border-border p-4 bg-card">
              <div>
                <p className="text-dense text-muted-foreground">Acquisition Date</p>
                <p className="text-sm font-medium mt-0.5">{formatDate(asset.acquisitionDate)}</p>
              </div>
              <div>
                <p className="text-dense text-muted-foreground">Salvage Value</p>
                <p className="text-sm font-medium mt-0.5"><Money value={salvageValue} /></p>
              </div>
              <div>
                <p className="text-dense text-muted-foreground">Useful Life</p>
                <p className="text-sm font-medium mt-0.5">{asset.usefulLifeMonths} months</p>
              </div>
              <div>
                <p className="text-dense text-muted-foreground">Depr. Method</p>
                <p className="text-sm font-medium mt-0.5">{asset.depreciationMethod.replace(/_/g, " ")}</p>
              </div>
              {asset.activatedAt && (
                <div>
                  <p className="text-dense text-muted-foreground">Activated</p>
                  <p className="text-sm font-medium mt-0.5">{formatDate(asset.activatedAt)}</p>
                </div>
              )}
              {asset.disposedAt && (
                <div>
                  <p className="text-dense text-muted-foreground">Disposed</p>
                  <p className="text-sm font-medium mt-0.5">{formatDate(asset.disposedAt)}</p>
                </div>
              )}
              {asset.disposalProceeds && (
                <div>
                  <p className="text-dense text-muted-foreground">Disposal Proceeds</p>
                  <p className="text-sm font-medium mt-0.5"><Money value={parseFloat(asset.disposalProceeds)} /></p>
                </div>
              )}
              {asset.disposalGainLoss && (
                <div>
                  <p className="text-dense text-muted-foreground">Gain / Loss</p>
                  <p className="text-sm font-medium mt-0.5"><Money value={parseFloat(asset.disposalGainLoss)} /></p>
                </div>
              )}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-foreground mb-3">Depreciation Schedule</h2>
            {asset.schedule.length === 0 ? (
              <p className="text-sm text-muted-foreground">No schedule generated yet. Activate the asset to start depreciation.</p>
            ) : (
              <DataTable
                data={asset.schedule}
                columns={scheduleColumns}
                getRowKey={(row) => row.id}
                minWidth="480px"
              />
            )}
          </div>
        </div>
      </PageWrapper>

      <AlertDialog open={activateConfirmOpen} onOpenChange={handleActivateDialogChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Activate {asset.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will activate the asset and generate the depreciation schedule. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={activateMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleActivateConfirm}
              disabled={activateMutation.isPending}
            >
              {activateMutation.isPending ? "Activating…" : "Activate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {asset.status === "DRAFT" && (
        <EditAssetSheet
          open={editOpen}
          onOpenChange={setEditOpen}
          asset={asset}
          onSuccess={() => void refetch()}
        />
      )}

      {asset.status === "ACTIVE" && (
        <EntityFormDialog
          open={disposeOpen}
          onOpenChange={setDisposeOpen}
          title="Dispose Asset"
          description="Record the disposal of this asset."
          resolver={zodResolver(disposeAssetSchema)}
          defaultValues={{ disposalDate: "", amount: "" }}
          onSubmit={handleDispose}
          isSubmitting={disposeMutation.isPending}
          submitLabel="Dispose Asset"
          resetOnOpen
        >
          {(form) => {
            const proceeds = parseFloat(form.watch("amount") || "0");
            const gainLoss = proceeds - bookValue;
            return (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="disp-date">Disposal Date</Label>
                  <Input id="disp-date" type="date" {...form.register("disposalDate")} />
                  {form.formState.errors.disposalDate && (
                    <p className="text-xs text-destructive">{form.formState.errors.disposalDate.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="disp-proceeds">Disposal Proceeds</Label>
                  <Input id="disp-proceeds" type="number" min={0} step="0.01" {...form.register("amount")} placeholder="0.00" />
                  {form.formState.errors.amount && (
                    <p className="text-xs text-destructive">{form.formState.errors.amount.message}</p>
                  )}
                </div>
                <div className="rounded-md bg-muted/50 border border-border px-3 py-2.5 text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-xs">Book value</span>
                    <Money value={bookValue} />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-xs">Proceeds</span>
                    <Money value={proceeds} />
                  </div>
                  <div className="flex justify-between font-medium border-t border-border pt-1 mt-1">
                    <span className="text-xs">{gainLoss >= 0 ? "Gain" : "Loss"}</span>
                    <Money value={gainLoss} />
                  </div>
                </div>
              </>
            );
          }}
        </EntityFormDialog>
      )}
    </>
  );
}
