"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Plus, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogBody,
} from "@/components/ui/dialog";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { TruncatedText } from "@/components/ui/truncated-text";
import { useUpdateInvoice } from "@/hooks/api/invoice";

function fmt(amount: string | number) {
  return `₹${Number(amount).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

interface LineItem {
  description: string;
  quantity: number | string;
  rate: number | string;
  amount: number | string;
}

interface InvoiceLineItemsProps {
  invoiceId: number;
  lineItems: LineItem[];
  subtotal: string | number;
  taxRate: string | number | null;
  taxAmount: string | number | null;
  discount: string | number | null;
  total: string | number;
  totalPaid: number;
  outstanding: number;
  dueDate: string | null;
  notes: string | null;
  currency: string | null;
  editOpen: boolean;
  onEditOpenChange: (open: boolean) => void;
}

const lineItemColumns: DataTableColumn<LineItem>[] = [
  {
    key: "description",
    header: "Description",
    cell: (row) => <TruncatedText text={row.description} lines={2} className="text-sm" />,
  },
  {
    key: "quantity",
    header: "Qty",
    headerClassName: "text-right w-20",
    className: "text-right text-sm",
    cell: (row) => row.quantity,
  },
  {
    key: "rate",
    header: "Rate",
    headerClassName: "text-right w-28",
    className: "text-right font-mono text-sm",
    cell: (row) => fmt(row.rate),
  },
  {
    key: "amount",
    header: "Amount",
    headerClassName: "text-right w-28",
    className: "text-right font-mono text-sm font-medium",
    cell: (row) => fmt(row.amount),
  },
];

function getLineItemKey(_: LineItem, i: number) {
  return i;
}

export function InvoiceLineItems({
  invoiceId,
  lineItems,
  subtotal,
  taxRate,
  taxAmount,
  discount,
  total,
  totalPaid,
  outstanding,
  dueDate,
  notes,
  currency,
  editOpen,
  onEditOpenChange,
}: InvoiceLineItemsProps) {
  const updateInvoice = useUpdateInvoice();

  const [editLineItems, setEditLineItems] = useState<
    { description: string; quantity: number; rate: number; amount: number }[]
  >([]);
  const [editTaxRate, setEditTaxRate] = useState(0);
  const [editDiscount, setEditDiscount] = useState(0);
  const [editDueDate, setEditDueDate] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editCurrency, setEditCurrency] = useState("INR");

  useEffect(() => {
    if (editOpen) {
      setEditLineItems(
        lineItems.map((i) => ({
          description: i.description,
          quantity: Number(i.quantity),
          rate: Number(i.rate),
          amount: Number(i.amount),
        })),
      );
      setEditTaxRate(Number(taxRate ?? 0));
      setEditDiscount(Number(discount ?? 0));
      setEditDueDate(dueDate ? format(new Date(dueDate), "yyyy-MM-dd") : "");
      setEditNotes(notes ?? "");
      setEditCurrency(currency ?? "INR");
    }
  }, [editOpen, lineItems, taxRate, discount, dueDate, notes, currency]);

  function handleDescriptionChange(idx: number, value: string) {
    setEditLineItems((prev) =>
      prev.map((li, i) => (i === idx ? { ...li, description: value } : li)),
    );
  }

  function handleQuantityChange(idx: number, value: string) {
    setEditLineItems((prev) =>
      prev.map((li, i) => {
        if (i !== idx) return li;
        const qty = Number(value);
        return { ...li, quantity: qty, amount: qty * li.rate };
      }),
    );
  }

  function handleRateChange(idx: number, value: string) {
    setEditLineItems((prev) =>
      prev.map((li, i) => {
        if (i !== idx) return li;
        const rate = Number(value);
        return { ...li, rate, amount: li.quantity * rate };
      }),
    );
  }

  function handleRemoveItem(idx: number) {
    setEditLineItems((p) => p.filter((_, i) => i !== idx));
  }

  function handleAddItem() {
    setEditLineItems((p) => [
      ...p,
      { description: "", quantity: 1, rate: 0, amount: 0 },
    ]);
  }

  function handleTaxRateChange(e: React.ChangeEvent<HTMLInputElement>) {
    setEditTaxRate(Number(e.target.value));
  }

  function handleDiscountChange(e: React.ChangeEvent<HTMLInputElement>) {
    setEditDiscount(Number(e.target.value));
  }

  function handleNotesChange(e: React.ChangeEvent<HTMLInputElement>) {
    setEditNotes(e.target.value);
  }

  function handleCurrencyChange(e: React.ChangeEvent<HTMLInputElement>) {
    setEditCurrency(e.target.value);
  }

  function handleCancelEdit() {
    onEditOpenChange(false);
  }

  function handleSaveEdit() {
    const validItems = editLineItems.filter(
      (i) => i.description.trim() && i.amount > 0,
    );
    if (validItems.length === 0) {
      toast.error("Add at least one line item");
      return;
    }
    updateInvoice.mutate(
      {
        id: invoiceId,
        lineItems: validItems,
        taxRate: editTaxRate,
        discount: editDiscount,
        currency: editCurrency,
        dueDate: editDueDate || undefined,
        notes: editNotes || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Invoice updated");
          onEditOpenChange(false);
        },
        onError: (err: unknown) => toast.error(getErrorMessage(err)),
      },
    );
  }

  const editSub = editLineItems.reduce((s, i) => s + i.amount, 0);
  const editTax = editSub * (editTaxRate / 100);
  const editTotal = editSub + editTax - editDiscount;

  return (
    <>
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <p className="text-sm font-semibold">Line Items</p>
        </div>
        <DataTable
          data={lineItems}
          columns={lineItemColumns}
          getRowKey={getLineItemKey}
          className="border-0 rounded-none"
        />
        <div className="px-4 py-3 border-t border-border space-y-1.5 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span>{fmt(subtotal)}</span>
          </div>
          {Number(taxRate) > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>Tax ({taxRate}%)</span>
              <span>{fmt(taxAmount ?? 0)}</span>
            </div>
          )}
          {Number(discount) > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>Discount</span>
              <span className="text-destructive">-{fmt(discount ?? 0)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base pt-1.5 border-t border-border">
            <span>Total</span>
            <span>{fmt(total)}</span>
          </div>
          {totalPaid > 0 && (
            <>
              <div className="flex justify-between text-status-success-ink">
                <span>Paid</span>
                <span>{fmt(totalPaid)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Outstanding</span>
                <span>{fmt(Math.max(0, outstanding))}</span>
              </div>
            </>
          )}
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={onEditOpenChange}>
        <DialogContent className="flex max-h-[90dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
          <DialogHeader className="shrink-0 border-b border-border px-6 py-4">
            <DialogTitle className="text-sm">Edit Invoice</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4 px-6 py-4">
            <div className="overflow-hidden rounded-lg border border-border">
              <div className="border-b border-border bg-muted/40 px-4 py-2">
                <p className="text-xs font-semibold">Line Items</p>
              </div>
              <div className="space-y-2 p-3">
                <div className="grid grid-cols-12 gap-2 px-1 text-xs text-muted-foreground">
                  <span className="col-span-5">Description</span>
                  <span className="col-span-2 text-right">Qty</span>
                  <span className="col-span-2 text-right">Rate</span>
                  <span className="col-span-2 text-right">Amount</span>
                </div>
                {editLineItems.map((item, idx) => (
                  <EditLineItemRow
                    key={idx}
                    item={item}
                    idx={idx}
                    isOnly={editLineItems.length === 1}
                    onDescriptionChange={handleDescriptionChange}
                    onQuantityChange={handleQuantityChange}
                    onRateChange={handleRateChange}
                    onRemove={handleRemoveItem}
                  />
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-1"
                  onClick={handleAddItem}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Item
                </Button>
              </div>
              <div className="px-4 py-3 border-t border-border space-y-1 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{fmt(editSub)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax ({editTaxRate}%)</span>
                  <span>{fmt(editTax)}</span>
                </div>
                {editDiscount > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Discount</span>
                    <span className="text-destructive">
                      -{fmt(editDiscount)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between font-bold border-t border-border pt-1.5">
                  <span>Total</span>
                  <span>{fmt(editTotal)}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Tax Rate (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={editTaxRate}
                  onChange={handleTaxRateChange}
                  className="text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Discount (₹)</Label>
                <Input
                  type="number"
                  min={0}
                  value={editDiscount}
                  onChange={handleDiscountChange}
                  className="text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Due Date</Label>
                <DatePicker
                  value={editDueDate}
                  onChange={setEditDueDate}
                  placeholder="Select due date"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Currency</Label>
                <Input
                  value={editCurrency}
                  onChange={handleCurrencyChange}
                  className="text-sm"
                  placeholder="INR"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Notes / Payment Terms</Label>
              <Input
                value={editNotes}
                onChange={handleNotesChange}
                className="text-sm"
                placeholder="e.g. Payment due within 30 days"
              />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={handleCancelEdit}>
              Cancel
            </Button>
            <LoadingButton
              size="sm"
              isPending={updateInvoice.isPending}
              onClick={handleSaveEdit}
            >
              <Check className="mr-1 h-3.5 w-3.5" />
              Save Changes
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface EditLineItemRowProps {
  item: { description: string; quantity: number; rate: number; amount: number };
  idx: number;
  isOnly: boolean;
  onDescriptionChange: (idx: number, value: string) => void;
  onQuantityChange: (idx: number, value: string) => void;
  onRateChange: (idx: number, value: string) => void;
  onRemove: (idx: number) => void;
}

function EditLineItemRow({
  item,
  idx,
  isOnly,
  onDescriptionChange,
  onQuantityChange,
  onRateChange,
  onRemove,
}: EditLineItemRowProps) {
  function handleDescChange(e: React.ChangeEvent<HTMLInputElement>) {
    onDescriptionChange(idx, e.target.value);
  }
  function handleQtyChange(e: React.ChangeEvent<HTMLInputElement>) {
    onQuantityChange(idx, e.target.value);
  }
  function handleRateFieldChange(e: React.ChangeEvent<HTMLInputElement>) {
    onRateChange(idx, e.target.value);
  }
  function handleRemoveClick() {
    onRemove(idx);
  }

  return (
    <div className="grid grid-cols-12 gap-2 items-center">
      <Input
        className="col-span-5"
        placeholder="Description"
        value={item.description}
        onChange={handleDescChange}
      />
      <Input
        className="col-span-2 text-right"
        type="number"
        min={1}
        value={item.quantity || ""}
        onChange={handleQtyChange}
        aria-label={`Quantity for item ${idx + 1}`}
      />
      <Input
        className="col-span-2 text-right"
        type="number"
        min={0}
        value={item.rate || ""}
        onChange={handleRateFieldChange}
        aria-label={`Rate for item ${idx + 1}`}
      />
      <div className="col-span-2 text-sm font-medium text-right pr-1">
        {fmt(item.amount)}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="col-span-1 h-8 w-8 text-muted-foreground hover:text-destructive"
        onClick={handleRemoveClick}
        disabled={isOnly}
        aria-label={`Remove item ${idx + 1}`}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
