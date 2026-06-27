"use client";

import { useState, useMemo, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingState } from "@/components/shared/loading-state";
import { ErrorState } from "@/components/shared/error-state";
import { useWarehouses } from "@/lib/api/hooks/inventory/warehouses";
import { useProducts } from "@/lib/api/hooks/inventory/products";
import { useCreateSalesOrder } from "@/lib/api/hooks/inventory/sales-orders";
import { useClientAccounts } from "@/lib/api/hooks/crm";

interface DraftLine {
  key: number;
  productId: string;
  quantity: string;
  unitPrice: string;
  taxRate: string;
  discount: string;
}

interface Warehouse {
  id: number;
  name: string;
  code: string;
}

interface Product {
  id: number;
  name: string;
  sku: string;
  sellingPrice: string | number | null;
}

interface Customer {
  id: number;
  clientName: string;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function emptyLine(key: number): DraftLine {
  return { key, productId: "", quantity: "1", unitPrice: "0", taxRate: "0", discount: "0" };
}

function num(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export default function NewSalesOrderPage() {
  const router = useRouter();
  const warehousesQuery = useWarehouses();
  const productsQuery = useProducts({ limit: 500 });
  const clientsQuery = useClientAccounts({});
  const createMutation = useCreateSalesOrder();

  const [customerId, setCustomerId] = useState<string>("");
  const [warehouseId, setWarehouseId] = useState<string>("");
  const [expectedShipDate, setExpectedShipDate] = useState<string>("");
  const [currency, setCurrency] = useState<string>("INR");
  const [shippingAddress, setShippingAddress] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [lines, setLines] = useState<DraftLine[]>([emptyLine(0)]);
  const [nextKey, setNextKey] = useState<number>(1);

  const warehouses = (warehousesQuery.data ?? []) as Warehouse[];
  const products = (productsQuery.data?.items ?? []) as Product[];
  const customers = (clientsQuery.data?.accounts ?? []) as Customer[];

  const computed = useMemo(() => {
    const lineCalcs = lines.map((ln) => {
      const qty = num(ln.quantity);
      const price = num(ln.unitPrice);
      const tax = num(ln.taxRate);
      const disc = num(ln.discount);
      const subtotal = round2(qty * price);
      const discAmt = round2(subtotal * (disc / 100));
      const taxAmt = round2((subtotal - discAmt) * (tax / 100));
      return { subtotal, discAmt, taxAmt, total: round2(subtotal - discAmt + taxAmt) };
    });
    const subtotal = round2(lineCalcs.reduce((acc, l) => acc + l.subtotal, 0));
    const totalDisc = round2(lineCalcs.reduce((acc, l) => acc + l.discAmt, 0));
    const totalTax = round2(lineCalcs.reduce((acc, l) => acc + l.taxAmt, 0));
    const total = round2(lineCalcs.reduce((acc, l) => acc + l.total, 0));
    return { subtotal, totalDisc, totalTax, total };
  }, [lines]);

  function updateLine(key: number, patch: Partial<DraftLine>): void {
    setLines((prev) => prev.map((ln) => (ln.key === key ? { ...ln, ...patch } : ln)));
  }

  function handleLineFieldChange(key: number, field: keyof DraftLine) {
    return (event: ChangeEvent<HTMLInputElement>) => updateLine(key, { [field]: event.target.value });
  }

  function handleProductChange(key: number, value: string): void {
    const product = products.find((p) => String(p.id) === value);
    const unitPrice = product?.sellingPrice ? String(product.sellingPrice) : "0";
    updateLine(key, { productId: value, unitPrice });
  }

  function handleAddLine(): void {
    setLines((prev) => [...prev, emptyLine(nextKey)]);
    setNextKey((k) => k + 1);
  }

  function handleRemoveLine(key: number): void {
    setLines((prev) => (prev.length > 1 ? prev.filter((ln) => ln.key !== key) : prev));
  }

  function handleCustomerChange(value: string): void {
    setCustomerId(value);
  }

  function handleWarehouseChange(value: string): void {
    setWarehouseId(value);
  }

  function handleExpectedShipDateChange(event: ChangeEvent<HTMLInputElement>): void {
    setExpectedShipDate(event.target.value);
  }

  function handleCurrencyChange(event: ChangeEvent<HTMLInputElement>): void {
    setCurrency(event.target.value);
  }

  function handleShippingAddressChange(event: ChangeEvent<HTMLTextAreaElement>): void {
    setShippingAddress(event.target.value);
  }

  function handleNotesChange(event: ChangeEvent<HTMLTextAreaElement>): void {
    setNotes(event.target.value);
  }

  async function handleSubmit(): Promise<void> {
    if (!warehouseId) {
      toast.error("Select a warehouse");
      return;
    }
    const validLines = lines.filter((ln) => ln.productId && num(ln.quantity) > 0);
    if (validLines.length === 0) {
      toast.error("At least one line item is required");
      return;
    }
    try {
      const result = await createMutation.mutateAsync({
        customerId: customerId ? Number(customerId) : undefined,
        warehouseId: Number(warehouseId),
        expectedShipDate: expectedShipDate || undefined,
        currency: currency.trim() || undefined,
        shippingAddress: shippingAddress.trim() || undefined,
        notes: notes.trim() || undefined,
        lines: validLines.map((ln) => ({
          productId: Number(ln.productId),
          quantity: num(ln.quantity),
          unitPrice: num(ln.unitPrice),
          taxRate: num(ln.taxRate) || undefined,
          discount: num(ln.discount) || undefined,
        })),
      });
      const so = result as { id: number; soNumber: string };
      toast.success(`Sales order ${so.soNumber} created`);
      router.push(`/inventory/sales-orders/${so.id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create sales order";
      toast.error(message);
    }
  }

  const isLoading = warehousesQuery.isLoading || productsQuery.isLoading || clientsQuery.isLoading;
  if (isLoading) return <LoadingState variant="form" />;
  if (warehousesQuery.error) return <ErrorState description={warehousesQuery.error.message} />;
  if (productsQuery.error) return <ErrorState description={productsQuery.error.message} />;

  return (
    <PageWrapper
      eyebrow="Inventory · Sales Orders"
      title="New Sales Order"
      subtitle="Create a customer sales order. Confirm it to reserve stock."
    >
      <div className="space-y-4">
        <Card className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-sm text-muted-foreground block mb-1">Customer</label>
              <Select value={customerId} onValueChange={handleCustomerChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select customer (optional)" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.clientName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground block mb-1">Warehouse <span className="text-destructive">*</span></label>
              <Select value={warehouseId} onValueChange={handleWarehouseChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select warehouse" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={String(w.id)}>
                      {w.name} ({w.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground block mb-1">Expected Ship Date</label>
              <Input type="date" value={expectedShipDate} onChange={handleExpectedShipDateChange} min={todayIso()} />
            </div>
            <div>
              <label className="text-sm text-muted-foreground block mb-1">Currency</label>
              <Input value={currency} onChange={handleCurrencyChange} placeholder="INR" />
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table className="min-w-[760px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right w-[90px]">Qty</TableHead>
                  <TableHead className="text-right w-[110px]">Unit Price</TableHead>
                  <TableHead className="text-right w-[90px]">Tax %</TableHead>
                  <TableHead className="text-right w-[90px]">Disc %</TableHead>
                  <TableHead className="text-right w-[110px]">Line Total</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((ln) => {
                  const qty = num(ln.quantity);
                  const price = num(ln.unitPrice);
                  const disc = num(ln.discount);
                  const tax = num(ln.taxRate);
                  const sub = round2(qty * price);
                  const discAmt = round2(sub * (disc / 100));
                  const taxAmt = round2((sub - discAmt) * (tax / 100));
                  const lineTotal = round2(sub - discAmt + taxAmt);
                  return (
                    <TableRow key={ln.key}>
                      <TableCell>
                        <Select value={ln.productId} onValueChange={(v) => handleProductChange(ln.key, v)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select product" />
                          </SelectTrigger>
                          <SelectContent className="max-h-72">
                            {products.map((p) => (
                              <SelectItem key={p.id} value={String(p.id)}>
                                {p.name} ({p.sku})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={ln.quantity}
                          onChange={handleLineFieldChange(ln.key, "quantity")}
                          className="text-right tabular-nums"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={ln.unitPrice}
                          onChange={handleLineFieldChange(ln.key, "unitPrice")}
                          className="text-right tabular-nums"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={ln.taxRate}
                          onChange={handleLineFieldChange(ln.key, "taxRate")}
                          className="text-right tabular-nums"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={ln.discount}
                          onChange={handleLineFieldChange(ln.key, "discount")}
                          className="text-right tabular-nums"
                        />
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm">
                        {lineTotal.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveLine(ln.key)}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div>
                <label className="text-sm text-muted-foreground block mb-1">Shipping Address</label>
                <Textarea value={shippingAddress} onChange={handleShippingAddressChange} rows={2} />
              </div>
              <div>
                <label className="text-sm text-muted-foreground block mb-1">Notes</label>
                <Textarea value={notes} onChange={handleNotesChange} rows={2} />
              </div>
            </div>
            <div className="space-y-1 text-sm tabular-nums">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{computed.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Discount</span>
                <span>−{computed.totalDisc.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax</span>
                <span>{computed.totalTax.toFixed(2)}</span>
              </div>
              <div className="border-t border-border pt-1 flex justify-between font-medium text-base">
                <span>Total</span>
                <span>{computed.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </Card>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => router.push("/inventory/sales-orders")}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="w-full sm:w-auto"
            onClick={handleSubmit}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? "Creating…" : "Create Sales Order"}
          </Button>
        </div>
      </div>
    </PageWrapper>
  );
}
