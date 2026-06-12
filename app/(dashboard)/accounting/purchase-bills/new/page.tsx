"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingState } from "@/components/shared/loading-state";
import { ErrorState } from "@/components/shared/error-state";
import { useAccounts, useCreatePurchaseBill, type CreatePurchaseBillInput } from "@/lib/api/hooks/accounting";
import { useClientAccounts } from "@/lib/api/hooks/crm/clients";
import { INDIAN_STATES } from "@/lib/accounting/indian-states";

interface DraftItem {
  key: number;
  description: string;
  hsnSacCode: string;
  quantity: string;
  rate: string;
  gstRate: string;
}

const GST_RATES = ["0", "5", "12", "18", "28"] as const;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function emptyItem(key: number): DraftItem {
  return { key, description: "", hsnSacCode: "", quantity: "1", rate: "0", gstRate: "18" };
}

function num(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export default function NewPurchaseBillPage() {
  const router = useRouter();
  const clientsQuery = useClientAccounts({});
  const accountsQuery = useAccounts({ page: 1, pageSize: 500, activeOnly: true, type: "EXPENSE" });
  const createMutation = useCreatePurchaseBill();

  const [vendorId, setVendorId] = useState<string>("");
  const [vendorBillNumber, setVendorBillNumber] = useState<string>("");
  const [billDate, setBillDate] = useState<string>(todayIso());
  const [dueDate, setDueDate] = useState<string>("");
  const [status, setStatus] = useState<"DRAFT" | "POSTED">("DRAFT");
  const [placeOfSupply, setPlaceOfSupply] = useState<string>("");
  const [vendorGstin, setVendorGstin] = useState<string>("");
  const [supplierGstin, setSupplierGstin] = useState<string>("");
  const [reverseCharge, setReverseCharge] = useState<boolean>(false);
  const [discount, setDiscount] = useState<string>("0");
  const [notes, setNotes] = useState<string>("");
  const [expenseAccountCode, setExpenseAccountCode] = useState<string>("5990");
  const [items, setItems] = useState<DraftItem[]>([emptyItem(0)]);
  const [nextKey, setNextKey] = useState<number>(1);

  const computed = useMemo(() => {
    const lines = items.map((it) => {
      const qty = num(it.quantity);
      const rate = num(it.rate);
      const gstRate = num(it.gstRate);
      const amount = round2(qty * rate);
      const tax = round2(amount * (gstRate / 100));
      return { amount, tax, gstRate };
    });
    const subtotal = round2(lines.reduce((acc, l) => acc + l.amount, 0));
    const taxPool = round2(lines.reduce((acc, l) => acc + l.tax, 0));
    const supplierState = supplierGstin && supplierGstin.length >= 2 ? supplierGstin.slice(0, 2) : placeOfSupply;
    const placeState = placeOfSupply || supplierState;
    const intra = supplierState !== "" && supplierState === placeState;
    const cgst = intra ? round2(taxPool / 2) : 0;
    const sgst = intra ? round2(taxPool - cgst) : 0;
    const igst = intra ? 0 : taxPool;
    const total = round2(subtotal + taxPool - num(discount));
    return { subtotal, taxPool, cgst, sgst, igst, total, intra };
  }, [items, supplierGstin, placeOfSupply, discount]);

  function updateItem(key: number, patch: Partial<DraftItem>): void {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  }

  function handleItemFieldChange(key: number, field: keyof DraftItem) {
    return (event: ChangeEvent<HTMLInputElement>) => updateItem(key, { [field]: event.target.value });
  }

  function handleItemGstRateChange(key: number, value: string): void {
    updateItem(key, { gstRate: value });
  }

  function handleAddItem(): void {
    setItems((prev) => [...prev, emptyItem(nextKey)]);
    setNextKey((k) => k + 1);
  }

  function handleRemoveItem(key: number): void {
    setItems((prev) => (prev.length > 1 ? prev.filter((it) => it.key !== key) : prev));
  }

  function handleVendorChange(value: string): void {
    setVendorId(value);
    const vendor = clientsQuery.data?.accounts.find((c: { id: number }) => String(c.id) === value);
    if (vendor) {
      const possibleGstin = (vendor as unknown as { gstin?: string | null }).gstin;
      if (possibleGstin && !vendorGstin) setVendorGstin(possibleGstin);
      const possibleState = (vendor as unknown as { state?: string | null }).state;
      if (possibleState && !placeOfSupply) {
        const match = INDIAN_STATES.find((s) => s.stateName.toLowerCase() === possibleState.toLowerCase());
        if (match) setPlaceOfSupply(match.stateCode);
      }
    }
  }

  function handlePlaceOfSupplyChange(value: string): void {
    setPlaceOfSupply(value);
  }

  function handleStatusChange(value: string): void {
    if (value === "DRAFT" || value === "POSTED") setStatus(value);
  }

  function handleExpenseChange(value: string): void {
    setExpenseAccountCode(value);
  }

  function handleReverseChargeChange(checked: boolean): void {
    setReverseCharge(checked);
  }

  function handleVendorBillNumberChange(event: ChangeEvent<HTMLInputElement>): void {
    setVendorBillNumber(event.target.value);
  }

  function handleBillDateChange(event: ChangeEvent<HTMLInputElement>): void {
    setBillDate(event.target.value);
  }

  function handleDueDateChange(event: ChangeEvent<HTMLInputElement>): void {
    setDueDate(event.target.value);
  }

  function handleVendorGstinChange(event: ChangeEvent<HTMLInputElement>): void {
    setVendorGstin(event.target.value.toUpperCase());
  }

  function handleSupplierGstinChange(event: ChangeEvent<HTMLInputElement>): void {
    setSupplierGstin(event.target.value.toUpperCase());
  }

  function handleDiscountChange(event: ChangeEvent<HTMLInputElement>): void {
    setDiscount(event.target.value);
  }

  function handleNotesChange(event: ChangeEvent<HTMLTextAreaElement>): void {
    setNotes(event.target.value);
  }

  async function handleSubmit(): Promise<void> {
    if (!vendorId) {
      toast.error("Select a vendor");
      return;
    }
    if (!billDate) {
      toast.error("Bill date is required");
      return;
    }
    const validItems = items.filter((it) => it.description.trim().length > 0 && num(it.quantity) > 0 && num(it.rate) >= 0);
    if (validItems.length === 0) {
      toast.error("At least one line item is required");
      return;
    }

    const payload: CreatePurchaseBillInput = {
      vendorId: Number(vendorId),
      vendorBillNumber: vendorBillNumber.trim() || undefined,
      billDate,
      dueDate: dueDate || undefined,
      status,
      placeOfSupply: placeOfSupply || undefined,
      vendorGstin: vendorGstin.trim() || undefined,
      supplierGstin: supplierGstin.trim() || undefined,
      reverseCharge,
      discount: num(discount),
      notes: notes.trim() || undefined,
      expenseAccountCode,
      items: validItems.map((it) => ({
        description: it.description.trim(),
        hsnSacCode: it.hsnSacCode.trim() || undefined,
        quantity: num(it.quantity),
        rate: num(it.rate),
        gstRate: num(it.gstRate),
      })),
    };

    try {
      const result = await createMutation.mutateAsync(payload);
      toast.success(`Bill ${result.billNumber} created`);
      router.push(`/accounting/purchase-bills/${result.id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create bill";
      toast.error(message);
    }
  }

  if (clientsQuery.isLoading || accountsQuery.isLoading) return <LoadingState variant="form" />;
  if (clientsQuery.error) return <ErrorState description={clientsQuery.error.message} />;
  if (accountsQuery.error) return <ErrorState description={accountsQuery.error.message} />;

  const vendors = clientsQuery.data?.accounts ?? [];
  const expenseAccounts = accountsQuery.data?.items ?? [];

  return (
    <PageWrapper
      eyebrow="Accounting · Purchase Bills"
      title="New purchase bill"
      subtitle="Record a vendor bill. Posting credits AP and debits the chosen expense account + Input GST."
    >
      <div className="space-y-4">
        <Card className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-sm text-muted-foreground block mb-1">Vendor</label>
              <Select value={vendorId} onValueChange={handleVendorChange}>
                <SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {vendors.map((v) => (
                    <SelectItem key={v.id} value={String(v.id)}>{v.clientName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground block mb-1">Vendor bill #</label>
              <Input value={vendorBillNumber} onChange={handleVendorBillNumberChange} placeholder="As printed on the bill" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground block mb-1">Status</label>
              <Select value={status} onValueChange={handleStatusChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="POSTED">Post immediately</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground block mb-1">Bill date</label>
              <Input type="date" value={billDate} onChange={handleBillDateChange} />
            </div>
            <div>
              <label className="text-sm text-muted-foreground block mb-1">Due date</label>
              <Input type="date" value={dueDate} onChange={handleDueDateChange} />
            </div>
            <div>
              <label className="text-sm text-muted-foreground block mb-1">Expense account</label>
              <Select value={expenseAccountCode} onValueChange={handleExpenseChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {expenseAccounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.code}>{acc.code} — {acc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-sm font-medium mb-3">GST</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-sm text-muted-foreground block mb-1">Place of supply</label>
              <Select value={placeOfSupply} onValueChange={handlePlaceOfSupplyChange}>
                <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {INDIAN_STATES.map((s) => (
                    <SelectItem key={s.stateCode} value={s.stateCode}>{s.stateCode} — {s.stateName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground block mb-1">Vendor GSTIN</label>
              <Input value={vendorGstin} onChange={handleVendorGstinChange} placeholder="15-char GSTIN" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground block mb-1">Your GSTIN</label>
              <Input value={supplierGstin} onChange={handleSupplierGstinChange} placeholder="15-char GSTIN" />
            </div>
            <div className="sm:col-span-3 flex items-center gap-2">
              <Checkbox id="reverse-charge" checked={reverseCharge} onCheckedChange={(v: boolean | "indeterminate") => handleReverseChargeChange(v === true)} />
              <label htmlFor="reverse-charge" className="text-sm">Reverse charge applies</label>
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead className="w-[100px]">HSN/SAC</TableHead>
                <TableHead className="text-right w-[100px]">Qty</TableHead>
                <TableHead className="text-right w-[120px]">Rate</TableHead>
                <TableHead className="w-[100px]">GST %</TableHead>
                <TableHead className="text-right w-[120px]">Amount</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((it) => {
                const amount = round2(num(it.quantity) * num(it.rate));
                return (
                  <TableRow key={it.key}>
                    <TableCell><Input value={it.description} onChange={handleItemFieldChange(it.key, "description")} placeholder="What is this for?" /></TableCell>
                    <TableCell><Input value={it.hsnSacCode} onChange={handleItemFieldChange(it.key, "hsnSacCode")} /></TableCell>
                    <TableCell><Input type="number" min="0" step="0.01" value={it.quantity} onChange={handleItemFieldChange(it.key, "quantity")} className="text-right tabular-nums" /></TableCell>
                    <TableCell><Input type="number" min="0" step="0.01" value={it.rate} onChange={handleItemFieldChange(it.key, "rate")} className="text-right tabular-nums" /></TableCell>
                    <TableCell>
                      <Select value={it.gstRate} onValueChange={(v) => handleItemGstRateChange(it.key, v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {GST_RATES.map((r) => <SelectItem key={r} value={r}>{r}%</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{amount.toFixed(2)}</TableCell>
                    <TableCell>
                      <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveItem(it.key)} disabled={items.length <= 1}>
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <div className="p-3 border-t border-slate-200/60">
            <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
              <Plus className="size-4 mr-1" />
              Add line
            </Button>
          </div>
        </Card>

        <Card className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="text-sm text-muted-foreground block mb-1">Notes</label>
              <Textarea value={notes} onChange={handleNotesChange} rows={3} />
              <div className="mt-4">
                <label className="text-sm text-muted-foreground block mb-1">Discount</label>
                <Input type="number" min="0" step="0.01" value={discount} onChange={handleDiscountChange} className="max-w-xs" />
              </div>
            </div>
            <div className="space-y-1 text-sm tabular-nums">
              <div className="flex justify-between"><span>Subtotal</span><span>{computed.subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Discount</span><span>−{num(discount).toFixed(2)}</span></div>
              {computed.intra && computed.cgst > 0 && (
                <div className="flex justify-between"><span>CGST</span><span>{computed.cgst.toFixed(2)}</span></div>
              )}
              {computed.intra && computed.sgst > 0 && (
                <div className="flex justify-between"><span>SGST</span><span>{computed.sgst.toFixed(2)}</span></div>
              )}
              {!computed.intra && computed.igst > 0 && (
                <div className="flex justify-between"><span>IGST</span><span>{computed.igst.toFixed(2)}</span></div>
              )}
              <div className="border-t border-slate-200/60 pt-1 flex justify-between font-medium text-base">
                <span>Total</span><span>{computed.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.push("/accounting/purchase-bills")}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending ? "Saving…" : status === "POSTED" ? "Create and post" : "Save as draft"}
          </Button>
        </div>
      </div>
    </PageWrapper>
  );
}
