"use client";

import { useState, useCallback, type ChangeEvent } from "react";
import { motion } from "framer-motion";
import { Plus, ClipboardList, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import {
  useAdjustments,
  useCreateAdjustment,
  type AdjustmentListItem,
  type AdjustmentReason,
  type AdjustmentType,
} from "@/hooks/api/inventory/stock";
import { useWarehouses } from "@/hooks/api/inventory/warehouses";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";

interface WarehouseOption {
  id: number;
  name: string;
}

interface AdjFormState {
  warehouseId: string;
  productId: string;
  locationId: string;
  adjustmentType: AdjustmentType;
  quantity: string;
  reason: AdjustmentReason;
  notes: string;
}

const REASON_LABELS: Record<AdjustmentReason, string> = {
  PURCHASE: "Purchase",
  SALE: "Sale",
  RETURN: "Return",
  DAMAGE: "Damage",
  EXPIRY: "Expiry",
  THEFT: "Theft / Loss",
  RECOUNT: "Recount",
  OTHER: "Other",
};

const REASON_OPTIONS: AdjustmentReason[] = [
  "PURCHASE",
  "SALE",
  "RETURN",
  "DAMAGE",
  "EXPIRY",
  "THEFT",
  "RECOUNT",
  "OTHER",
];

const STATUS_COLORS: Record<string, string> = {
  POSTED: "bg-emerald-50 text-emerald-700 border-emerald-200/70",
  DRAFT: "bg-slate-50 text-slate-600 border-slate-200/70",
  VOIDED: "bg-red-50 text-red-700 border-red-200/70",
};

function blankForm(): AdjFormState {
  return {
    warehouseId: "",
    productId: "",
    locationId: "",
    adjustmentType: "IN",
    quantity: "",
    reason: "RECOUNT",
    notes: "",
  };
}

function AdjustmentsTableSkeleton() {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            {Array.from({ length: 6 }).map((_, i) => (
              <TableHead key={i}>
                <Skeleton className="h-3 w-16" />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 6 }).map((_, i) => (
            <TableRow key={i}>
              {Array.from({ length: 6 }).map((__, j) => (
                <TableCell key={j}>
                  <Skeleton className="h-4 w-full" />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default function AdjustmentsPage() {
  const { data: adjData, isLoading, isError, refetch } = useAdjustments();
  const { data: warehousesData } = useWarehouses();
  const createMutation = useCreateAdjustment();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState<AdjFormState>(blankForm());

  const adjustments: AdjustmentListItem[] = adjData?.items ?? [];

  const warehouses: WarehouseOption[] = Array.isArray(warehousesData)
    ? warehousesData
    : [];

  const setField = useCallback(
    <K extends keyof AdjFormState>(key: K, value: AdjFormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const handleReasonChange = useCallback((value: string) => {
    const match = REASON_OPTIONS.find((reason) => reason === value);
    if (match) setForm((prev) => ({ ...prev, reason: match }));
  }, []);

  const handleTypeChange = useCallback((value: string) => {
    if (value === "IN" || value === "OUT" || value === "SET") {
      setForm((prev) => ({ ...prev, adjustmentType: value }));
    }
  }, []);

  const handleOpenSheet = useCallback(() => {
    setForm(blankForm());
    setSheetOpen(true);
  }, []);

  const handleSheetOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setSheetOpen(false);
      setForm(blankForm());
    }
  }, []);

  function handleRetry() {
    void refetch();
  }

  const handleWarehouseSelectChange = useCallback(
    (v: string) => {
      setField("warehouseId", v);
    },
    [setField],
  );

  const handleProductIdChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setField("productId", e.target.value);
    },
    [setField],
  );

  const handleLocationIdChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setField("locationId", e.target.value);
    },
    [setField],
  );

  const handleQtyChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setField("quantity", e.target.value);
    },
    [setField],
  );

  const handleNotesChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      setField("notes", e.target.value);
    },
    [setField],
  );

  const handleCancelSheet = useCallback(() => {
    setSheetOpen(false);
    setForm(blankForm());
  }, []);

  const handleSubmit = useCallback(() => {
    const warehouseId = Number(form.warehouseId);
    const productId = Number(form.productId);
    const locationId = Number(form.locationId);
    const quantity = Number(form.quantity);

    if (!warehouseId) {
      toast.error("Warehouse is required");
      return;
    }
    if (!productId) {
      toast.error("Product variant ID is required");
      return;
    }
    if (!locationId) {
      toast.error("Location ID is required");
      return;
    }
    if (!quantity || isNaN(quantity) || quantity <= 0) {
      toast.error("Quantity must be a positive number");
      return;
    }

    createMutation.mutate(
      {
        warehouseId,
        productId,
        locationId,
        adjustmentType: form.adjustmentType,
        quantity,
        reason: form.reason,
        notes: form.notes.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Adjustment created");
          setSheetOpen(false);
          setForm(blankForm());
        },
        onError: (err: unknown) => toast.error(getErrorMessage(err)),
      },
    );
  }, [form, createMutation]);

  return (
    <PageWrapper
      title="Stock Adjustments"
      subtitle="Record inventory corrections, write-offs, and manual changes"
      badge={String(adjustments.length)}
      actions={
        <Button size="sm" className="gap-1.5" onClick={handleOpenSheet}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          New Adjustment
        </Button>
      }
    >
      {isLoading ? (
        <AdjustmentsTableSkeleton />
      ) : isError ? (
        <motion.div variants={fadeUp} initial="hidden" animate="visible">
          <EmptyState
            illustration={
              <AlertCircle
                className="h-12 w-12 text-muted-foreground/40"
                aria-hidden="true"
              />
            }
            title="Failed to load adjustments"
            description="An error occurred while fetching adjustment records. Please try again."
            action={{ label: "Retry", onClick: handleRetry }}
          />
        </motion.div>
      ) : adjustments.length === 0 ? (
        <motion.div variants={fadeUp} initial="hidden" animate="visible">
          <EmptyState
            illustration={
              <ClipboardList
                className="h-12 w-12 text-muted-foreground/40"
                aria-hidden="true"
              />
            }
            title="No adjustments yet"
            description="Create a stock adjustment to correct on-hand quantities."
            action={{ label: "New Adjustment", onClick: handleOpenSheet }}
          />
        </motion.div>
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={fadeUp}>
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="text-xs font-semibold">
                      Reference
                    </TableHead>
                    <TableHead className="text-xs font-semibold">
                      Date
                    </TableHead>
                    <TableHead className="text-xs font-semibold">
                      Reason
                    </TableHead>
                    <TableHead className="text-xs font-semibold">
                      Lines
                    </TableHead>
                    <TableHead className="text-xs font-semibold">
                      Status
                    </TableHead>
                    <TableHead className="text-xs font-semibold">
                      Created By
                    </TableHead>
                    <TableHead className="text-xs font-semibold">
                      Notes
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adjustments.map((adj) => (
                    <TableRow key={adj.id} className="text-sm">
                      <TableCell className="py-2.5 font-mono text-xs font-semibold">
                        {adj.referenceNumber}
                      </TableCell>
                      <TableCell className="py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(adj.createdAt), "dd MMM yyyy")}
                      </TableCell>
                      <TableCell className="py-2.5 text-xs">
                        {REASON_LABELS[adj.reason]}
                      </TableCell>
                      <TableCell className="py-2.5 text-xs text-muted-foreground tabular-nums">
                        {adj.lineCount}
                      </TableCell>
                      <TableCell className="py-2.5">
                        <Badge
                          className={cn(
                            "text-[10px] px-1.5 py-0 h-4",
                            STATUS_COLORS[adj.status] ??
                              "bg-muted text-muted-foreground",
                          )}
                        >
                          {adj.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2.5 text-xs text-muted-foreground">
                        {adj.createdByName ?? "—"}
                      </TableCell>
                      <TableCell className="py-2.5 text-xs text-muted-foreground max-w-[200px] truncate">
                        {adj.notes ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </motion.div>
        </motion.div>
      )}

      <Sheet open={sheetOpen} onOpenChange={handleSheetOpenChange}>
        <SheetContent
          side="right"
          className="sm:max-w-md w-full flex flex-col gap-0 p-0"
        >
          <SheetHeader className="px-6 pt-6 pb-4 border-b">
            <SheetTitle>New Stock Adjustment</SheetTitle>
            <SheetDescription>
              Manually adjust stock quantities to correct discrepancies.
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="adj-warehouse">
                Warehouse <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.warehouseId}
                onValueChange={handleWarehouseSelectChange}
              >
                <SelectTrigger id="adj-warehouse">
                  <SelectValue placeholder="Select warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((wh) => (
                    <SelectItem key={wh.id} value={String(wh.id)}>
                      {wh.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="adj-product">
                Product Variant ID <span className="text-destructive">*</span>
              </Label>
              <Input
                id="adj-product"
                type="number"
                placeholder="Product variant ID"
                value={form.productId}
                onChange={handleProductIdChange}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="adj-location">
                Location ID <span className="text-destructive">*</span>
              </Label>
              <Input
                id="adj-location"
                type="number"
                placeholder="Location ID"
                value={form.locationId}
                onChange={handleLocationIdChange}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="adj-type">
                Adjustment Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.adjustmentType}
                onValueChange={handleTypeChange}
              >
                <SelectTrigger id="adj-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IN">In (Add stock)</SelectItem>
                  <SelectItem value="OUT">Out (Remove stock)</SelectItem>
                  <SelectItem value="SET">Set (Absolute quantity)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="adj-qty">
                Quantity <span className="text-destructive">*</span>
              </Label>
              <Input
                id="adj-qty"
                type="number"
                min="0"
                placeholder="0"
                value={form.quantity}
                onChange={handleQtyChange}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="adj-reason">
                Reason <span className="text-destructive">*</span>
              </Label>
              <Select value={form.reason} onValueChange={handleReasonChange}>
                <SelectTrigger id="adj-reason">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REASON_OPTIONS.map((reason) => (
                    <SelectItem key={reason} value={reason}>
                      {REASON_LABELS[reason]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="adj-notes">Notes</Label>
              <Textarea
                id="adj-notes"
                placeholder="Additional details about this adjustment…"
                value={form.notes}
                onChange={handleNotesChange}
                rows={3}
              />
            </div>
          </div>
          <SheetFooter>
            <Button
              variant="outline"
              onClick={handleCancelSheet}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating…" : "Create Adjustment"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageWrapper>
  );
}
