"use client";

import { useState, useCallback } from "react";
import { useForm, useFieldArray, useWatch, Controller, type Control, type UseFormSetValue } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Plus, ArrowRightLeft, AlertCircle, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { useTransfers, useCreateTransfer, type TransferStatus } from "@/hooks/api/inventory/stock";
import { useWarehouses, useLocations } from "@/hooks/api/inventory/warehouses";
import { useProductVariants } from "@/hooks/api/inventory/products";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";

const schema = z
  .object({
    fromWarehouseId: z.number().int().positive(),
    fromLocationId: z.number({ error: "From location required" }).int().positive(),
    toWarehouseId: z.number().int().positive(),
    toLocationId: z.number({ error: "To location required" }).int().positive(),
    notes: z.string().max(500).optional(),
    lines: z
      .array(z.object({
        productVariantId: z.number({ error: "Variant required" }).int().positive(),
        quantity: z.number().positive(),
      }))
      .min(1, "At least one line required"),
  })
  .refine((d) => d.fromLocationId !== d.toLocationId, {
    message: "From and to locations must be different",
    path: ["toLocationId"],
  });

type FormValues = z.infer<typeof schema>;

const STATUS_COLORS: Record<TransferStatus, string> = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-200/70",
  IN_TRANSIT: "bg-blue-50 text-blue-700 border-blue-200/70",
  COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200/70",
  CANCELLED: "bg-red-50 text-red-700 border-red-200/70",
};
const STATUS_LABELS: Record<TransferStatus, string> = {
  PENDING: "Pending", IN_TRANSIT: "In Transit", COMPLETED: "Completed", CANCELLED: "Cancelled",
};
const ALL_STATUSES: TransferStatus[] = ["PENDING", "IN_TRANSIT", "COMPLETED", "CANCELLED"];
const TH = "text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2.5";
const LIMIT = 20;

function TransfersTableSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            {Array.from({ length: 7 }).map((_, i) => <TableHead key={i} className={TH}><Skeleton className="h-3 w-16" /></TableHead>)}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              {Array.from({ length: 7 }).map((_, j) => <TableCell key={j} className="px-3 py-2.5"><Skeleton className="h-4 w-full" /></TableCell>)}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

interface WLPickerProps {
  control: Control<FormValues>;
  setValue: UseFormSetValue<FormValues>;
  warehouses: { id: number; name: string }[];
  warehouseField: "fromWarehouseId" | "toWarehouseId";
  locationField: "fromLocationId" | "toLocationId";
  labels: [string, string];
  warehouseError?: string;
  locationError?: string;
}

function WarehouseLocationPicker({ control, setValue, warehouses, warehouseField, locationField, labels, warehouseError, locationError }: WLPickerProps) {
  const warehouseId = useWatch({ control, name: warehouseField });
  const { data: locations = [] } = useLocations(warehouseId);
  return (
    <>
      <div className="space-y-1.5">
        <Label>{labels[0]} <span className="text-destructive">*</span></Label>
        <Controller name={warehouseField} control={control} render={({ field }) => (
          <Select value={field.value > 0 ? String(field.value) : ""} onValueChange={(v) => { field.onChange(Number(v)); setValue(locationField, 0); }}>
            <SelectTrigger><SelectValue placeholder="Select warehouse" /></SelectTrigger>
            <SelectContent>{warehouses.map((w) => <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>)}</SelectContent>
          </Select>
        )} />
        {warehouseError && <p className="text-xs text-destructive">{warehouseError}</p>}
      </div>
      <div className="space-y-1.5">
        <Label>{labels[1]} <span className="text-destructive">*</span></Label>
        <Controller name={locationField} control={control} render={({ field }) => (
          <Select value={field.value > 0 ? String(field.value) : ""} onValueChange={(v) => field.onChange(Number(v))} disabled={warehouseId === 0}>
            <SelectTrigger>
              <SelectValue placeholder={warehouseId === 0 ? "Select warehouse first" : "Select location"} />
            </SelectTrigger>
            <SelectContent>{locations.map((l) => <SelectItem key={l.id} value={String(l.id)}>{l.name} ({l.code})</SelectItem>)}</SelectContent>
          </Select>
        )} />
        {locationError && <p className="text-xs text-destructive">{locationError}</p>}
      </div>
    </>
  );
}

function NewTransferSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { data: warehouses = [] } = useWarehouses();
  const { data: variants = [] } = useProductVariants({ activeOnly: true });
  const createMutation = useCreateTransfer();

  const { control, handleSubmit, reset, setValue, register, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fromWarehouseId: 0, fromLocationId: 0, toWarehouseId: 0, toLocationId: 0,
      notes: "", lines: [{ productVariantId: 0, quantity: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "lines" });

  const handleClose = useCallback(() => { onOpenChange(false); reset(); }, [onOpenChange, reset]);
  const handleAddLine = useCallback(() => { append({ productVariantId: 0, quantity: 0 }); }, [append]);
  const handleRemoveLine = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const idx = e.currentTarget.dataset.lineIdx;
    if (idx !== undefined) remove(Number(idx));
  }, [remove]);

  const onSubmit = useCallback((data: FormValues) => {
    createMutation.mutate(
      {
        fromLocationId: data.fromLocationId,
        toLocationId: data.toLocationId,
        notes: data.notes || undefined,
        lines: data.lines.map((l) => ({ productVariantId: l.productVariantId, quantity: l.quantity })),
      },
      {
        onSuccess: () => { toast.success("Transfer created"); handleClose(); },
        onError: (err: Error) => toast.error(getErrorMessage(err)),
      },
    );
  }, [createMutation, handleClose]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <SheetTitle>New Transfer</SheetTitle>
          <SheetDescription>Move stock between warehouse locations.</SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <WarehouseLocationPicker
                control={control} setValue={setValue} warehouses={warehouses}
                warehouseField="fromWarehouseId" locationField="fromLocationId"
                labels={["From Warehouse", "From Location"]}
                warehouseError={errors.fromWarehouseId?.message}
                locationError={errors.fromLocationId?.message}
              />
              <WarehouseLocationPicker
                control={control} setValue={setValue} warehouses={warehouses}
                warehouseField="toWarehouseId" locationField="toLocationId"
                labels={["To Warehouse", "To Location"]}
                warehouseError={errors.toWarehouseId?.message}
                locationError={errors.toLocationId?.message}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea {...register("notes")} placeholder="Reason or notes for this transfer…" rows={2} />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Lines <span className="text-destructive">*</span></Label>
                <Button type="button" variant="outline" size="sm" onClick={handleAddLine}>
                  <Plus className="h-3.5 w-3.5 mr-1" aria-hidden="true" />Add line
                </Button>
              </div>
              {fields.map((f, index) => (
                <div key={f.id} className="flex gap-2 items-start">
                  <div className="flex-1 space-y-1">
                    <Controller name={`lines.${index}.productVariantId`} control={control} render={({ field }) => (
                      <Select value={field.value > 0 ? String(field.value) : ""} onValueChange={(v) => field.onChange(Number(v))}>
                        <SelectTrigger><SelectValue placeholder="Select variant" /></SelectTrigger>
                        <SelectContent>
                          {variants.map((v) => (
                            <SelectItem key={v.id} value={String(v.id)}>{v.productName} — {v.name} ({v.sku})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )} />
                    {errors.lines?.[index]?.productVariantId && (
                      <p className="text-xs text-destructive">{errors.lines[index]?.productVariantId?.message}</p>
                    )}
                  </div>
                  <div className="w-28 space-y-1">
                    <Input type="number" min="0.0001" step="0.0001" placeholder="Qty"
                      {...register(`lines.${index}.quantity`, { valueAsNumber: true })} />
                    {errors.lines?.[index]?.quantity && (
                      <p className="text-xs text-destructive">{errors.lines[index]?.quantity?.message}</p>
                    )}
                  </div>
                  {fields.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" className="mt-0.5 shrink-0 text-destructive hover:text-destructive"
                      data-line-idx={index} onClick={handleRemoveLine}>
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
          <SheetFooter className="px-6 py-4 border-t gap-2 flex-row justify-end">
            <Button type="button" variant="outline" onClick={handleClose} disabled={createMutation.isPending}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending}
              className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all duration-200">
              {createMutation.isPending ? "Creating…" : "Create Transfer"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

export default function TransfersPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<TransferStatus | "all">("all");
  const [page, setPage] = useState(1);
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data: transfersData, isLoading, isError, refetch } = useTransfers({
    status: statusFilter === "all" ? undefined : statusFilter,
    page,
    limit: LIMIT,
  });

  const transfers = transfersData?.items ?? [];
  const totalPages = transfersData?.totalPages ?? 1;
  const total = transfersData?.total ?? 0;

  const handleStatusChange = useCallback((val: string) => {
    if (val === "all" || val in STATUS_LABELS) {
      setStatusFilter(val as TransferStatus | "all");
      setPage(1);
    }
  }, []);
  const handleOpenSheet = useCallback(() => setSheetOpen(true), []);
  function handleRetry() { void refetch(); }
  const handlePrevPage = useCallback(() => setPage((p) => Math.max(1, p - 1)), []);
  const handleNextPage = useCallback(() => setPage((p) => Math.min(totalPages, p + 1)), [totalPages]);
  const handleRowClick = useCallback((e: React.MouseEvent<HTMLTableRowElement>) => {
    const id = e.currentTarget.dataset.transferId;
    if (id) router.push(`/inventory/stock/transfers/${id}`);
  }, [router]);

  return (
    <PageWrapper
      title="Stock Transfers"
      subtitle="Move inventory between warehouses and locations"
      badge={isLoading ? undefined : String(total)}
      filters={
        <Select value={statusFilter} onValueChange={handleStatusChange}>
          <SelectTrigger className="h-8 text-xs w-36"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {ALL_STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
          </SelectContent>
        </Select>
      }
      actions={
        <Button size="sm" onClick={handleOpenSheet}
          className="gap-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all duration-200">
          <Plus className="h-4 w-4" aria-hidden="true" />New Transfer
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
            description="An error occurred while fetching transfer records."
            action={{ label: "Retry", onClick: handleRetry }}
          />
        </motion.div>
      ) : transfers.length === 0 ? (
        <motion.div variants={fadeUp} initial="hidden" animate="visible">
          <EmptyState
            illustration={<ArrowRightLeft className="h-12 w-12 text-muted-foreground/40" aria-hidden="true" />}
            title="No transfers found"
            description={statusFilter !== "all" ? `No ${STATUS_LABELS[statusFilter]} transfers found.` : "Create a transfer to move stock between locations."}
            action={{ label: "New Transfer", onClick: handleOpenSheet }}
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
                    <TableHead className={TH}>From Location</TableHead>
                    <TableHead className={TH}>To Location</TableHead>
                    <TableHead className={cn(TH, "text-right")}>Lines</TableHead>
                    <TableHead className={TH}>Status</TableHead>
                    <TableHead className={TH}>Created</TableHead>
                    <TableHead className={TH}>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transfers.map((transfer) => (
                    <TableRow key={transfer.id} data-transfer-id={String(transfer.id)} onClick={handleRowClick}
                      className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer">
                      <TableCell className="px-3 py-2.5">
                        <Link href={`/inventory/stock/transfers/${transfer.id}`} onClick={(e) => e.stopPropagation()}
                          className="font-mono text-xs font-semibold text-primary hover:underline">
                          {transfer.referenceNumber}
                        </Link>
                      </TableCell>
                      <TableCell className="px-3 py-2.5 text-xs text-muted-foreground">{transfer.fromLocationName ?? "—"}</TableCell>
                      <TableCell className="px-3 py-2.5 text-xs text-muted-foreground">{transfer.toLocationName ?? "—"}</TableCell>
                      <TableCell className="px-3 py-2.5 text-right text-xs tabular-nums font-medium">{transfer.lineCount}</TableCell>
                      <TableCell className="px-3 py-2.5">
                        <Badge className={cn("text-xs px-1.5 py-0.5 rounded-md font-medium border", STATUS_COLORS[transfer.status] ?? "bg-muted text-muted-foreground")}>
                          {STATUS_LABELS[transfer.status] ?? transfer.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(transfer.createdAt), "dd MMM yyyy")}
                      </TableCell>
                      <TableCell className="px-3 py-2.5">
                        <Link href={`/inventory/stock/transfers/${transfer.id}`} onClick={(e) => e.stopPropagation()}
                          className="text-xs text-primary hover:underline">View</Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
                <span>Page {page} of {totalPages}</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handlePrevPage} disabled={page <= 1}>Previous</Button>
                  <Button variant="outline" size="sm" onClick={handleNextPage} disabled={page >= totalPages}>Next</Button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
      <NewTransferSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </PageWrapper>
  );
}
