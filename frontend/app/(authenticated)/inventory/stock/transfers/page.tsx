"use client";

import { useState, useCallback, useMemo, type ChangeEvent } from "react";
import { motion } from "framer-motion";
import { Plus, ArrowRightLeft, AlertCircle } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import Link from "next/link";
import { toast } from "sonner";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import {
  useTransfers,
  useCreateTransfer,
  type TransferListItem,
  type TransferStatus,
} from "@/lib/api/hooks/inventory/stock";
import { useWarehouses } from "@/lib/api/hooks/inventory/warehouses";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";

interface WarehouseOption {
  id: number;
  name: string;
}

interface TransferFormState {
  fromWarehouseId: string;
  toWarehouseId: string;
  productId: string;
  quantity: string;
  notes: string;
}

const STATUS_COLORS: Record<TransferStatus, string> = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-200/70",
  IN_TRANSIT: "bg-blue-50 text-blue-700 border-blue-200/70",
  COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200/70",
  CANCELLED: "bg-red-50 text-red-700 border-red-200/70",
};

const STATUS_LABELS: Record<TransferStatus, string> = {
  PENDING: "Pending",
  IN_TRANSIT: "In Transit",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const ALL_STATUSES: TransferStatus[] = ["PENDING", "IN_TRANSIT", "COMPLETED", "CANCELLED"];

function isTransferStatusOrAll(val: string): val is TransferStatus | "all" {
  return val === "all" || val in STATUS_LABELS;
}

function blankForm(): TransferFormState {
  return { fromWarehouseId: "", toWarehouseId: "", productId: "", quantity: "", notes: "" };
}

function TransfersTableSkeleton() {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            {Array.from({ length: 7 }).map((_, i) => (
              <TableHead key={i}><Skeleton className="h-3 w-16" /></TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 6 }).map((_, i) => (
            <TableRow key={i}>
              {Array.from({ length: 7 }).map((__, j) => (
                <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default function TransfersPage() {
  const [statusFilter, setStatusFilter] = useState<TransferStatus | "all">("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState<TransferFormState>(blankForm());

  const { data: transfersData, isLoading, isError, refetch } = useTransfers();
  const { data: warehousesData } = useWarehouses();
  const createMutation = useCreateTransfer();

  const warehouses: WarehouseOption[] = Array.isArray(warehousesData) ? warehousesData : [];

  const allTransfers = useMemo<TransferListItem[]>(() => transfersData ?? [], [transfersData]);

  const transfers = useMemo(() => {
    if (statusFilter === "all") return allTransfers;
    return allTransfers.filter((t) => t.status === statusFilter);
  }, [allTransfers, statusFilter]);

  const setField = useCallback(
    <K extends keyof TransferFormState>(key: K, value: TransferFormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

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

  function handleRetry() { void refetch(); }

  const handleStatusFilterChange = useCallback((val: string) => {
    if (isTransferStatusOrAll(val)) setStatusFilter(val);
  }, []);

  const handleFromWarehouseChange = useCallback((v: string) => {
    setField("fromWarehouseId", v);
  }, [setField]);

  const handleToWarehouseChange = useCallback((v: string) => {
    setField("toWarehouseId", v);
  }, [setField]);

  const handleProductIdChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setField("productId", e.target.value);
  }, [setField]);

  const handleQtyChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setField("quantity", e.target.value);
  }, [setField]);

  const handleNotesChange = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => {
    setField("notes", e.target.value);
  }, [setField]);

  const handleCancelSheet = useCallback(() => {
    setSheetOpen(false);
    setForm(blankForm());
  }, []);

  const handleSubmit = useCallback(() => {
    const fromWarehouseId = Number(form.fromWarehouseId);
    const toWarehouseId = Number(form.toWarehouseId);
    const productId = Number(form.productId);
    const quantity = Number(form.quantity);

    if (!fromWarehouseId) { toast.error("From warehouse is required"); return; }
    if (!toWarehouseId) { toast.error("To warehouse is required"); return; }
    if (fromWarehouseId === toWarehouseId) { toast.error("From and to warehouses must differ"); return; }
    if (!productId) { toast.error("Product ID is required"); return; }
    if (!quantity || isNaN(quantity) || quantity <= 0) { toast.error("Quantity must be a positive number"); return; }

    createMutation.mutate(
      {
        fromWarehouseId,
        toWarehouseId,
        lines: [{ productId, quantity }],
        notes: form.notes.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Transfer created");
          setSheetOpen(false);
          setForm(blankForm());
        },
        onError: (err: unknown) => toast.error(getErrorMessage(err)),
      },
    );
  }, [form, createMutation]);

  return (
    <PageWrapper
      title="Stock Transfers"
      subtitle="Move inventory between warehouses and locations"
      badge={String(transfers.length)}
      filters={
        <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
          <SelectTrigger className="h-8 text-xs w-36">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {ALL_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
      actions={
        <Button size="sm" className="gap-1.5" onClick={handleOpenSheet}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          New Transfer
        </Button>
      }
    >
      {isLoading ? (
        <TransfersTableSkeleton />
      ) : isError ? (
        <motion.div variants={fadeUp} initial="hidden" animate="visible">
          <EmptyState
            illustration={<AlertCircle className="h-12 w-12 text-muted-foreground/40" aria-hidden="true" />}
            title="Failed to load transfers"
            description="An error occurred while fetching transfer records. Please try again."
            action={{ label: "Retry", onClick: handleRetry }}
          />
        </motion.div>
      ) : transfers.length === 0 ? (
        <motion.div variants={fadeUp} initial="hidden" animate="visible">
          <EmptyState
            illustration={
              <ArrowRightLeft className="h-12 w-12 text-muted-foreground/40" aria-hidden="true" />
            }
            title="No transfers found"
            description={
              statusFilter !== "all"
                ? `No transfers with status "${STATUS_LABELS[statusFilter]}".`
                : "Create a transfer to move stock between locations."
            }
            action={{ label: "New Transfer", onClick: handleOpenSheet }}
          />
        </motion.div>
      ) : (
        <motion.div variants={staggerContainer} initial="hidden" animate="visible">
          <motion.div variants={fadeUp}>
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="text-xs font-semibold">Reference</TableHead>
                    <TableHead className="text-xs font-semibold">Status</TableHead>
                    <TableHead className="text-xs font-semibold">From</TableHead>
                    <TableHead className="text-xs font-semibold">To</TableHead>
                    <TableHead className="text-xs font-semibold">Lines</TableHead>
                    <TableHead className="text-xs font-semibold">Created</TableHead>
                    <TableHead className="text-xs font-semibold">Completed</TableHead>
                    <TableHead className="text-xs font-semibold">Created By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transfers.map((transfer) => (
                    <TableRow key={transfer.id} className="text-sm">
                      <TableCell className="py-2.5">
                        <Link
                          href={`/inventory/stock/transfers/${transfer.id}`}
                          className="font-mono text-xs font-semibold text-primary hover:underline"
                        >
                          {transfer.referenceNumber}
                        </Link>
                      </TableCell>
                      <TableCell className="py-2.5">
                        <Badge
                          className={cn(
                            "text-[10px] px-1.5 py-0 h-4",
                            STATUS_COLORS[transfer.status] ??
                              "bg-muted text-muted-foreground",
                          )}
                        >
                          {STATUS_LABELS[transfer.status] ?? transfer.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2.5 text-xs text-muted-foreground">
                        {transfer.fromLocationName ?? "—"}
                      </TableCell>
                      <TableCell className="py-2.5 text-xs text-muted-foreground">
                        {transfer.toLocationName ?? "—"}
                      </TableCell>
                      <TableCell className="py-2.5 text-xs text-muted-foreground tabular-nums">
                        {transfer.lineCount}
                      </TableCell>
                      <TableCell className="py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(transfer.createdAt), "dd MMM yyyy")}
                      </TableCell>
                      <TableCell className="py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                        {transfer.completedAt
                          ? format(new Date(transfer.completedAt), "dd MMM yyyy")
                          : "—"}
                      </TableCell>
                      <TableCell className="py-2.5 text-xs text-muted-foreground">
                        {transfer.createdByName ?? "—"}
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
        <SheetContent side="right" className="sm:max-w-md w-full flex flex-col gap-0 p-0">
          <SheetHeader className="px-6 pt-6 pb-4 border-b">
            <SheetTitle>New Transfer</SheetTitle>
            <SheetDescription>
              Move stock from one warehouse to another.
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="tf-from">From Warehouse <span className="text-destructive">*</span></Label>
              <Select value={form.fromWarehouseId} onValueChange={handleFromWarehouseChange}>
                <SelectTrigger id="tf-from">
                  <SelectValue placeholder="Select source warehouse" />
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
              <Label htmlFor="tf-to">To Warehouse <span className="text-destructive">*</span></Label>
              <Select value={form.toWarehouseId} onValueChange={handleToWarehouseChange}>
                <SelectTrigger id="tf-to">
                  <SelectValue placeholder="Select destination warehouse" />
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
              <Label htmlFor="tf-product">Product ID <span className="text-destructive">*</span></Label>
              <Input
                id="tf-product"
                type="number"
                placeholder="Product ID"
                value={form.productId}
                onChange={handleProductIdChange}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tf-qty">Quantity <span className="text-destructive">*</span></Label>
              <Input
                id="tf-qty"
                type="number"
                min="1"
                placeholder="0"
                value={form.quantity}
                onChange={handleQtyChange}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tf-notes">Notes</Label>
              <Textarea
                id="tf-notes"
                placeholder="Reason or notes for this transfer…"
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
              {createMutation.isPending ? "Creating…" : "Create Transfer"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageWrapper>
  );
}
