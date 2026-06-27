"use client";

import { useMemo, useState, useEffect, type ChangeEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingState, ErrorState } from "@/components/shared";
import { useVendors, useProductVariants, useCreatePurchaseOrder } from "@/lib/api/hooks/inventory";
import type { CreatePurchaseOrderInput, CreatePoLineInput } from "@/types/inventory";

interface DraftLine {
  key: number;
  productVariantId: string;
  quantity: string;
  unitCost: string;
  taxRate: string;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function emptyLine(key: number): DraftLine {
  return { key, productVariantId: "", quantity: "1", unitCost: "0", taxRate: "0" };
}

function num(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedVendorId = searchParams.get("vendorId") ?? "";

  const vendorsQuery = useVendors({ isActive: true, limit: 200 });
  const variantsQuery = useProductVariants({ activeOnly: true });
  const createMutation = useCreatePurchaseOrder();

  const [vendorId, setVendorId] = useState<string>(preselectedVendorId);
  const [orderDate, setOrderDate] = useState<string>(todayIso());
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [lines, setLines] = useState<DraftLine[]>([emptyLine(0)]);
  const [nextKey, setNextKey] = useState<number>(1);

  useEffect(() => {
    if (preselectedVendorId) setVendorId(preselectedVendorId);
  }, [preselectedVendorId]);

  const totals = useMemo(() => {
    const lineData = lines.map((l) => {
      const qty = num(l.quantity);
      const cost = num(l.unitCost);
      const taxRate = num(l.taxRate);
      const amount = round2(qty * cost);
      const tax = round2(amount * (taxRate / 100));
      return { amount, tax };
    });
    const subtotal = round2(lineData.reduce((acc, l) => acc + l.amount, 0));
    const taxTotal = round2(lineData.reduce((acc, l) => acc + l.tax, 0));
    const total = round2(subtotal + taxTotal);
    return { subtotal, taxTotal, total };
  }, [lines]);

  function updateLine(key: number, patch: Partial<DraftLine>): void {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function handleVariantChange(key: number, value: string): void {
    const variant = variantsQuery.data?.find((v) => String(v.id) === value);
    const costPrice = variant ? String(Number(variant.costPrice).toFixed(2)) : "0";
    updateLine(key, { productVariantId: value, unitCost: costPrice });
  }

  function handleLineFieldChange(key: number, field: keyof DraftLine) {
    return (e: ChangeEvent<HTMLInputElement>) => updateLine(key, { [field]: e.target.value });
  }

  function handleAddLine(): void {
    setLines((prev) => [...prev, emptyLine(nextKey)]);
    setNextKey((k) => k + 1);
  }

  function handleRemoveLine(key: number): void {
    setLines((prev) => (prev.length > 1 ? prev.filter((l) => l.key !== key) : prev));
  }

  function handleVendorChange(value: string): void { setVendorId(value); }
  function handleOrderDateChange(e: ChangeEvent<HTMLInputElement>): void { setOrderDate(e.target.value); }
  function handleExpectedDeliveryChange(e: ChangeEvent<HTMLInputElement>): void { setExpectedDeliveryDate(e.target.value); }
  function handleNotesChange(e: ChangeEvent<HTMLTextAreaElement>): void { setNotes(e.target.value); }

  function handleCancel(): void {
    router.push("/inventory/purchase-orders");
  }

  async function handleSubmit(): Promise<void> {
    if (!vendorId) {
      toast.error("Select a vendor");
      return;
    }
    if (!orderDate) {
      toast.error("Order date is required");
      return;
    }
    const validLines = lines.filter((l) => l.productVariantId && num(l.quantity) > 0);
    if (validLines.length === 0) {
      toast.error("Add at least one product line");
      return;
    }

    const payload: CreatePurchaseOrderInput = {
      vendorId: Number(vendorId),
      orderDate,
      expectedDeliveryDate: expectedDeliveryDate || undefined,
      notes: notes.trim() || undefined,
      lines: validLines.map<CreatePoLineInput>((l, idx) => ({
        productVariantId: Number(l.productVariantId),
        quantity: num(l.quantity),
        unitCost: num(l.unitCost),
        taxRate: num(l.taxRate),
        lineOrder: idx,
      })),
    };

    try {
      const result = await createMutation.mutateAsync(payload);
      toast.success(`PO ${result.poNumber} created`);
      router.push(`/inventory/purchase-orders/${result.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create purchase order");
    }
  }

  if (vendorsQuery.isLoading || variantsQuery.isLoading) return <LoadingState variant="form" />;
  if (vendorsQuery.error) return <ErrorState description={vendorsQuery.error.message} />;
  if (variantsQuery.error) return <ErrorState description={variantsQuery.error.message} />;

  const vendors = vendorsQuery.data?.items ?? [];
  const variants = variantsQuery.data ?? [];

  return (
    <PageWrapper
      eyebrow="Inventory · Purchase Orders"
      title="New purchase order"
      subtitle="Create a PO to order products from a supplier."
    >
      <div className="space-y-4">
        <Card className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-sm text-muted-foreground block mb-1">Vendor *</label>
              <Select value={vendorId} onValueChange={handleVendorChange}>
                <SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {vendors.map((v) => (
                    <SelectItem key={v.id} value={String(v.id)}>{v.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground block mb-1">Order date *</label>
              <Input type="date" value={orderDate} onChange={handleOrderDateChange} />
            </div>
            <div>
              <label className="text-sm text-muted-foreground block mb-1">Expected delivery</label>
              <Input type="date" value={expectedDeliveryDate} onChange={handleExpectedDeliveryChange} />
            </div>
            <div className="sm:col-span-3">
              <label className="text-sm text-muted-foreground block mb-1">Notes</label>
              <textarea
                value={notes}
                onChange={handleNotesChange}
                rows={2}
                placeholder="Any special instructions"
                className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              />
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table className="min-w-[760px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Product / SKU</TableHead>
                  <TableHead className="text-right w-[100px]">Qty</TableHead>
                  <TableHead className="text-right w-[130px]">Unit cost</TableHead>
                  <TableHead className="text-right w-[100px]">Tax %</TableHead>
                  <TableHead className="text-right w-[130px]">Amount</TableHead>
                  <TableHead className="w-[52px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line) => {
                  const amount = round2(num(line.quantity) * num(line.unitCost));
                  return (
                    <TableRow key={line.key}>
                      <TableCell>
                        <Select
                          value={line.productVariantId}
                          onValueChange={(v) => handleVariantChange(line.key, v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select product" />
                          </SelectTrigger>
                          <SelectContent className="max-h-72">
                            {variants.map((v) => (
                              <SelectItem key={v.id} value={String(v.id)}>
                                {v.productName} — {v.sku}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0.0001"
                          step="1"
                          value={line.quantity}
                          onChange={handleLineFieldChange(line.key, "quantity")}
                          className="text-right tabular-nums"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.unitCost}
                          onChange={handleLineFieldChange(line.key, "unitCost")}
                          className="text-right tabular-nums"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={line.taxRate}
                          onChange={handleLineFieldChange(line.key, "taxRate")}
                          className="text-right tabular-nums"
                        />
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm">
                        {amount.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveLine(line.key)}
                          disabled={lines.length <= 1}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <div className="p-3 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={handleAddLine}>
              <Plus className="size-4 mr-1" />
              Add line
            </Button>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex justify-end">
            <div className="space-y-1 text-sm tabular-nums w-64">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{totals.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax</span>
                <span>{totals.taxTotal.toFixed(2)}</span>
              </div>
              <div className="border-t border-border pt-1 flex justify-between font-medium text-base">
                <span>Total</span>
                <span>{totals.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </Card>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            className="w-full sm:w-auto"
            onClick={handleSubmit}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? "Creating…" : "Create PO"}
          </Button>
        </div>
      </div>
    </PageWrapper>
  );
}
