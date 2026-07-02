"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Plus, ClipboardList, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { EmptyState } from "@/components/ui/empty-state";
import { getErrorMessage } from "@/lib/get-error-message";
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
  DAMAGE: "bg-red-50 text-red-700 border-red-200/70",
  EXPIRY: "bg-red-50 text-red-700 border-red-200/70",
  THEFT: "bg-red-50 text-red-700 border-red-200/70",
  RETURN: "bg-amber-50 text-amber-700 border-amber-200/70",
  RECOUNT: "bg-blue-50 text-blue-700 border-blue-200/70",
  PURCHASE: "bg-emerald-50 text-emerald-700 border-emerald-200/70",
  SALE: "bg-emerald-50 text-emerald-700 border-emerald-200/70",
  OTHER: "bg-slate-50 text-slate-600 border-slate-200/70",
};
const STATUS_COLORS: Record<string, string> = {
  POSTED: "bg-emerald-50 text-emerald-700 border-emerald-200/70",
  DRAFT: "bg-slate-50 text-slate-600 border-slate-200/70",
  VOIDED: "bg-red-50 text-red-700 border-red-200/70",
};
const REASONS: AdjustmentReason[] = ["PURCHASE", "SALE", "RETURN", "DAMAGE", "EXPIRY", "THEFT", "RECOUNT", "OTHER"];
const TH = "text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2.5";

function TableSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            {Array.from({ length: 6 }).map((_, i) => (
              <TableHead key={i} className={TH}><Skeleton className="h-3 w-16" /></TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              {Array.from({ length: 6 }).map((__, j) => (
                <TableCell key={j} className="px-3 py-2.5"><Skeleton className="h-4 w-full" /></TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default function AdjustmentsPage() {
  const [page, setPage] = useState(1);
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data: adjData, isLoading, isError, refetch } = useAdjustments({ page, limit: 20 });
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
  const adjustments: AdjustmentListItem[] = adjData?.items ?? [];

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
        onSuccess: () => { toast.success("Adjustment created"); reset(); setSheetOpen(false); },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  const handleCreate = handleSubmit(onSubmit);

  return (
    <PageWrapper
      title="Stock Adjustments"
      subtitle="Record inventory corrections, write-offs, and manual changes"
      badge={String(adjData?.total ?? 0)}
      actions={
        <Button
          size="sm"
          className="gap-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
          onClick={handleOpenSheet}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          New Adjustment
        </Button>
      }
    >
      {isLoading ? (
        <TableSkeleton />
      ) : isError ? (
        <motion.div variants={fadeUp} initial="hidden" animate="visible">
          <EmptyState
            illustration={<AlertCircle className="h-12 w-12 text-muted-foreground/40" aria-hidden="true" />}
            title="Failed to load adjustments"
            description="An error occurred while fetching adjustment records."
            action={{ label: "Retry", onClick: handleRetry }}
          />
        </motion.div>
      ) : adjustments.length === 0 ? (
        <motion.div variants={fadeUp} initial="hidden" animate="visible">
          <EmptyState
            illustration={<ClipboardList className="h-12 w-12 text-muted-foreground/40" aria-hidden="true" />}
            title="No adjustments yet"
            description="Create a stock adjustment to correct on-hand quantities."
            action={{ label: "New Adjustment", onClick: handleOpenSheet }}
          />
        </motion.div>
      ) : (
        <motion.div variants={staggerContainer} initial="hidden" animate="visible">
          <motion.div variants={fadeUp}>
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
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
                    <TableRow key={adj.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <TableCell className="px-3 py-2.5 font-mono text-xs font-semibold">{adj.referenceNumber}</TableCell>
                      <TableCell className="px-3 py-2.5">
                        <Badge className={cn("text-xs px-1.5 py-0.5 rounded-md font-medium border", REASON_BADGE[adj.reason])}>
                          {REASON_LABELS[adj.reason]}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-3 py-2.5">
                        <Badge className={cn("text-xs px-1.5 py-0.5 rounded-md font-medium border", STATUS_COLORS[adj.status] ?? "bg-muted text-muted-foreground")}>
                          {adj.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-3 py-2.5 text-right text-xs font-medium tabular-nums">{adj.lineCount}</TableCell>
                      <TableCell className="px-3 py-2.5 text-xs text-muted-foreground">{adj.createdByName ?? "—"}</TableCell>
                      <TableCell className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(adj.createdAt), "dd MMM yyyy")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {adjData && adjData.totalPages > 1 && (
              <div className="flex items-center justify-end gap-2 mt-4">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={handlePrevPage}>Previous</Button>
                <span className="text-sm text-muted-foreground">Page {page} of {adjData.totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= adjData.totalPages} onClick={handleNextPage}>Next</Button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}

      <Sheet open={sheetOpen} onOpenChange={handleSheetChange}>
        <SheetContent className="w-full sm:max-w-lg flex flex-col gap-0 p-0">
          <SheetHeader className="p-6 border-b">
            <SheetTitle>New Stock Adjustment</SheetTitle>
            <SheetDescription>Manually adjust stock quantities to correct discrepancies.</SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="adj-warehouse">Warehouse <span className="text-destructive">*</span></Label>
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
              <Label htmlFor="adj-location">Location <span className="text-destructive">*</span></Label>
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
              <Label htmlFor="adj-variant">Product Variant <span className="text-destructive">*</span></Label>
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
              <Label htmlFor="adj-type">Adjustment Type <span className="text-destructive">*</span></Label>
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
              <Label htmlFor="adj-qty">Quantity <span className="text-destructive">*</span></Label>
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
              <Label htmlFor="adj-reason">Reason <span className="text-destructive">*</span></Label>
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
              <Label htmlFor="adj-notes">Notes</Label>
              <Textarea
                {...register("notes")}
                id="adj-notes"
                placeholder="Additional details…"
                rows={3}
              />
              {errors.notes && <p className="text-xs text-destructive">{errors.notes.message}</p>}
            </div>
          </div>

          <SheetFooter className="p-6 border-t">
            <Button variant="outline" onClick={handleCancel} disabled={createMutation.isPending}>
              Cancel
            </Button>
            <Button
              className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md"
              onClick={handleCreate}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Creating…" : "Create Adjustment"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageWrapper>
  );
}
