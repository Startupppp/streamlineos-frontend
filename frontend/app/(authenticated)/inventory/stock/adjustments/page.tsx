"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Plus, Search } from "lucide-react";
import { EmptyActivityIllustration, EmptySearchIllustration } from "@/components/illustrations";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { fadeUp, staggerContainer } from "@/lib/motion-variants";
import {
  useAdjustments,
  useCreateAdjustment,
  type AdjustmentListItem,
  type AdjustmentReason,
} from "@/hooks/api/inventory/stock";
import { useWarehouses, useLocations } from "@/hooks/api/inventory/warehouses";
import { useProductVariants } from "@/hooks/api/inventory/products";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { SkeletonTable } from "@/components/shared/skeletons/skeleton-table";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  ADJUSTMENT_STATUS_BADGE,
  ADJUSTMENT_STATUS_LABEL,
  type AdjustmentStatus,
} from "@/features/inventory/lib";
import { AdjustmentDetailSheet } from "@/features/inventory/components/stock/adjustment-detail-sheet";
import { cn } from "@/lib/utils";

const schema = z.object({
  warehouseId: z.number({ error: "Warehouse is required" }).int().positive(),
  locationId: z.number({ error: "Location is required" }).int().positive(),
  productVariantId: z.number({ error: "Product variant is required" }).int().positive(),
  adjustmentType: z.enum(["IN", "OUT", "SET"]),
  quantity: z.number({ error: "Quantity is required" }).min(0.0001, "Must be positive"),
  reason: z.enum(["PURCHASE", "SALE", "RETURN", "DAMAGE", "EXPIRY", "THEFT", "RECOUNT", "OTHER"]),
  notes: z.string().max(500).optional(),
});
type FormValues = z.infer<typeof schema>;

const REASON_LABELS: Record<AdjustmentReason, string> = {
  PURCHASE: "Purchase", SALE: "Sale", RETURN: "Return", DAMAGE: "Damage",
  EXPIRY: "Expiry", THEFT: "Theft / Loss", RECOUNT: "Recount", OTHER: "Other",
};
const REASON_BADGE: Record<AdjustmentReason, string> = {
  DAMAGE: "bg-red-50 text-red-700 border-red-200",
  EXPIRY: "bg-red-50 text-red-700 border-red-200",
  THEFT: "bg-red-50 text-red-700 border-red-200",
  RETURN: "bg-amber-50 text-amber-700 border-amber-200",
  RECOUNT: "bg-blue-50 text-blue-700 border-blue-200",
  PURCHASE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  SALE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  OTHER: "bg-slate-100 text-slate-700 border-slate-200",
};
const REASONS: AdjustmentReason[] = ["PURCHASE", "SALE", "RETURN", "DAMAGE", "EXPIRY", "THEFT", "RECOUNT", "OTHER"];
const ADJ_STATUSES: AdjustmentStatus[] = ["DRAFT", "PENDING_APPROVAL", "APPROVED", "POSTED", "CANCELLED"];

const TH = "text-[10px] uppercase tracking-wider font-bold px-2 py-1.5";

export default function AdjustmentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const searchQ = searchParams.get("q") ?? "";
  const reasonFilter = searchParams.get("reason") ?? "all";
  const statusFilter = searchParams.get("status") ?? "all";

  const [page, setPage] = useState(1);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const { data: adjData, isLoading, isError, refetch } = useAdjustments({
    page,
    limit: 20,
    status: statusFilter !== "all" ? statusFilter : undefined,
  });
  const { data: warehouses = [], isLoading: wLoading } = useWarehouses();
  const createMutation = useCreateAdjustment();

  const {
    control, handleSubmit, watch, reset, resetField, register,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { adjustmentType: "IN", reason: "RECOUNT" },
  });

  const warehouseId = watch("warehouseId");
  const { data: locations = [], isLoading: lLoading } = useLocations(warehouseId ?? 0);
  const { data: variants = [], isLoading: vLoading } = useProductVariants({ activeOnly: true });

  const adjustments = useMemo(() => {
    let result: AdjustmentListItem[] = adjData?.items ?? [];
    if (searchQ) {
      const q = searchQ.toLowerCase();
      result = result.filter(
        (a) =>
          a.referenceNumber.toLowerCase().includes(q) ||
          (a.createdByName?.toLowerCase().includes(q) ?? false),
      );
    }
    if (reasonFilter !== "all") {
      result = result.filter((a) => a.reason === reasonFilter);
    }
    return result;
  }, [adjData?.items, searchQ, reasonFilter]);

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const params = new URLSearchParams(searchParams.toString());
    if (e.target.value) params.set("q", e.target.value);
    else params.delete("q");
    params.delete("page");
    setPage(1);
    router.replace(`?${params.toString()}`);
  }

  const handleReasonChange = useCallback(
    (val: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (val === "all") params.delete("reason");
      else params.set("reason", val);
      params.delete("page");
      setPage(1);
      router.replace(`?${params.toString()}`);
    },
    [router, searchParams],
  );

  const handleStatusChange = useCallback(
    (val: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (val === "all") params.delete("status");
      else params.set("status", val);
      params.delete("page");
      setPage(1);
      router.replace(`?${params.toString()}`);
    },
    [router, searchParams],
  );

  function handleOpenSheet() {
    reset({ adjustmentType: "IN", reason: "RECOUNT" });
    setSheetOpen(true);
  }
  function handleSheetChange(open: boolean) {
    if (!open) { reset(); setSheetOpen(false); }
  }
  function handleCancel() { reset(); setSheetOpen(false); }
  function handleRetry() { void refetch(); }
  function handlePrevPage() { setPage((p) => p - 1); }
  function handleNextPage() { setPage((p) => p + 1); }

  function handleRowClick(adj: AdjustmentListItem) {
    setDetailId(adj.id);
    setDetailOpen(true);
  }

  function onSubmit(values: FormValues) {
    createMutation.mutate(
      {
        productVariantId: values.productVariantId,
        locationId: values.locationId,
        adjustmentType: values.adjustmentType,
        quantity: values.quantity,
        reason: values.reason,
        notes: values.notes?.trim() || undefined,
      },
      {
        onSuccess: (result) => {
          const msg =
            result.status === "PENDING_APPROVAL"
              ? "Adjustment created — awaiting approval"
              : "Adjustment created";
          toast.success(msg);
          reset();
          setSheetOpen(false);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  const handleCreate = handleSubmit(onSubmit);

  const subtitle = adjData?.total != null
    ? `${adjData.total} adjustment${adjData.total !== 1 ? "s" : ""}`
    : undefined;

  const hasActiveFilters = searchQ || reasonFilter !== "all" || statusFilter !== "all";

  return (
    <PageWrapper
      title="Stock Adjustments"
      eyebrow="Inventory / Stock"
      subtitle={subtitle}
      actions={
        <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={handleOpenSheet}>
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          New Adjustment
        </Button>
      }
      filters={
        <div className="flex w-full min-w-0 flex-nowrap items-center gap-2">
          <div className="relative min-w-0 flex-1 lg:max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" aria-hidden="true" />
            <Input
              placeholder="Search by ref or creator…"
              value={searchQ}
              onChange={handleSearchChange}
              className="h-8 w-full pl-8 text-xs"
            />
          </div>
          <Select value={reasonFilter} onValueChange={handleReasonChange}>
            <SelectTrigger className="h-8 w-[160px] text-xs">
              <SelectValue placeholder="All reasons" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All reasons</SelectItem>
              {REASONS.map((r) => (
                <SelectItem key={r} value={r}>{REASON_LABELS[r]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={handleStatusChange}>
            <SelectTrigger className="h-8 w-[160px] text-xs">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {ADJ_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{ADJUSTMENT_STATUS_LABEL[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      }
    >
      {isLoading ? (
        <SkeletonTable rows={8} columns={6} />
      ) : isError ? (
        <ErrorState
          title="Failed to load adjustments"
          description="An error occurred while fetching adjustment records."
          onRetry={handleRetry}
          className="flex-1 min-h-[40vh]"
        />
      ) : adjustments.length === 0 ? (
        <motion.div variants={fadeUp} initial="hidden" animate="visible">
          <InventoryEmptyState
            illustration={hasActiveFilters ? <EmptySearchIllustration /> : <EmptyActivityIllustration />}
            title={hasActiveFilters ? "No results" : "No adjustments yet"}
            description={
              hasActiveFilters
                ? "No adjustments match your filters."
                : "Create a stock adjustment to correct on-hand quantities."
            }
            action={
              hasActiveFilters
                ? { label: "Clear Filters", href: "?" }
                : { label: "New Adjustment", onClick: handleOpenSheet }
            }
            className="flex-1 min-h-[40vh]"
          />
        </motion.div>
      ) : (
        <motion.div variants={staggerContainer} initial="hidden" animate="visible">
          <motion.div variants={fadeUp}>
            <div className="rounded-md border border-border overflow-hidden bg-card">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/80 hover:bg-muted/80">
                    <TableHead className={TH}>Ref #</TableHead>
                    <TableHead className={TH}>Reason</TableHead>
                    <TableHead className={TH}>Status</TableHead>
                    <TableHead className={cn(TH, "text-right")}>Lines</TableHead>
                    <TableHead className={TH}>Created By</TableHead>
                    <TableHead className={TH}>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adjustments.map((adj) => (
                    <TableRow
                      key={adj.id}
                      className="h-8 border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => handleRowClick(adj)}
                    >
                      <TableCell className="px-2 py-1 font-mono text-[11px] font-semibold text-blue-600 hover:underline">
                        {adj.referenceNumber}
                      </TableCell>
                      <TableCell className="px-2 py-1">
                        <Badge variant="outline" className={cn("h-4 text-[9px] px-1.5 py-0 font-medium", REASON_BADGE[adj.reason])}>
                          {REASON_LABELS[adj.reason]}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-2 py-1">
                        <Badge
                          variant="outline"
                          className={cn(
                            "h-4 text-[9px] px-1.5 py-0 font-medium",
                            ADJUSTMENT_STATUS_BADGE[adj.status],
                          )}
                        >
                          {ADJUSTMENT_STATUS_LABEL[adj.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-2 py-1 text-right text-[11px] font-mono tabular-nums font-medium">{adj.lineCount}</TableCell>
                      <TableCell className="px-2 py-1 text-[11px] text-muted-foreground">{adj.createdByName ?? "—"}</TableCell>
                      <TableCell className="px-2 py-1 text-[11px] text-muted-foreground whitespace-nowrap">
                        {format(new Date(adj.createdAt), "dd MMM yyyy")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {adjData && adjData.totalPages > 1 && (
                <div className="shrink-0 flex items-center justify-between px-4 py-2 border-t">
                  <span className="text-xs text-muted-foreground">
                    Page {page} of {adjData.totalPages}
                  </span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="h-7 text-xs" disabled={page <= 1} onClick={handlePrevPage}>Previous</Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs" disabled={page >= adjData.totalPages} onClick={handleNextPage}>Next</Button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}

      <Sheet open={sheetOpen} onOpenChange={handleSheetChange}>
        <SheetContent className="w-full sm:max-w-lg flex flex-col gap-0 p-0">
          <SheetHeader className="shrink-0 px-6 py-4 border-b">
            <SheetTitle>New Stock Adjustment</SheetTitle>
            <SheetDescription>Manually adjust stock quantities to correct discrepancies.</SheetDescription>
          </SheetHeader>

          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="adj-warehouse" className="text-[13px] font-medium">Warehouse <span className="text-destructive">*</span></Label>
              <Controller
                control={control}
                name="warehouseId"
                render={({ field }) => (
                  <Select
                    value={field.value ? String(field.value) : ""}
                    disabled={wLoading}
                    onValueChange={(v) => { field.onChange(Number(v)); resetField("locationId"); }}
                  >
                    <SelectTrigger id="adj-warehouse">
                      <SelectValue placeholder={wLoading ? "Loading…" : "Select warehouse"} />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses.map((wh) => (
                        <SelectItem key={wh.id} value={String(wh.id)}>{wh.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.warehouseId && <p className="text-xs text-destructive">{errors.warehouseId.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="adj-location" className="text-[13px] font-medium">Location <span className="text-destructive">*</span></Label>
              <Controller
                control={control}
                name="locationId"
                render={({ field }) => (
                  <Select
                    value={field.value ? String(field.value) : ""}
                    disabled={!warehouseId || lLoading}
                    onValueChange={(v) => field.onChange(Number(v))}
                  >
                    <SelectTrigger id="adj-location">
                      <SelectValue
                        placeholder={
                          !warehouseId ? "Select warehouse first" : lLoading ? "Loading…" : "Select location"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((loc) => (
                        <SelectItem key={loc.id} value={String(loc.id)}>
                          {loc.name} ({loc.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.locationId && <p className="text-xs text-destructive">{errors.locationId.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="adj-variant" className="text-[13px] font-medium">Product Variant <span className="text-destructive">*</span></Label>
              <Controller
                control={control}
                name="productVariantId"
                render={({ field }) => (
                  <Select
                    value={field.value ? String(field.value) : ""}
                    disabled={vLoading}
                    onValueChange={(v) => field.onChange(Number(v))}
                  >
                    <SelectTrigger id="adj-variant">
                      <SelectValue placeholder={vLoading ? "Loading…" : "Select product variant"} />
                    </SelectTrigger>
                    <SelectContent>
                      {variants.map((v) => (
                        <SelectItem key={v.id} value={String(v.id)}>
                          {v.productName} — {v.name} ({v.sku})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.productVariantId && <p className="text-xs text-destructive">{errors.productVariantId.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="adj-type" className="text-[13px] font-medium">Adjustment Type <span className="text-destructive">*</span></Label>
              <Controller
                control={control}
                name="adjustmentType"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="adj-type"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IN">In (Add stock)</SelectItem>
                      <SelectItem value="OUT">Out (Remove stock)</SelectItem>
                      <SelectItem value="SET">Set (Absolute quantity)</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="adj-qty" className="text-[13px] font-medium">Quantity <span className="text-destructive">*</span></Label>
              <Input
                {...register("quantity", { valueAsNumber: true })}
                id="adj-qty"
                type="number"
                min="0.0001"
                step="0.0001"
                placeholder="0"
              />
              {errors.quantity && <p className="text-xs text-destructive">{errors.quantity.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="adj-reason" className="text-[13px] font-medium">Reason <span className="text-destructive">*</span></Label>
              <Controller
                control={control}
                name="reason"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="adj-reason"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {REASONS.map((r) => (
                        <SelectItem key={r} value={r}>{REASON_LABELS[r]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="adj-notes" className="text-[13px] font-medium">Notes</Label>
              <Textarea
                {...register("notes")}
                id="adj-notes"
                placeholder="Additional details…"
                rows={3}
              />
              {errors.notes && <p className="text-xs text-destructive">{errors.notes.message}</p>}
            </div>
          </div>

          <SheetFooter className="shrink-0 px-6 py-4 border-t">
            <div className="grid grid-cols-2 gap-2 w-full">
              <Button variant="outline" onClick={handleCancel} disabled={createMutation.isPending}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating…" : "Create Adjustment"}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AdjustmentDetailSheet
        adjustmentId={detailId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </PageWrapper>
  );
}
