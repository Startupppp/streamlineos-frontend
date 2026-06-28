"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { LoadingState } from "@/components/shared/loading-state";
import { ErrorState } from "@/components/shared/error-state";
import {
  useAccounts,
  useCreatePurchaseBill,
  type CreatePurchaseBillInput,
} from "@/lib/api/hooks/accounting";
import { useClientAccounts } from "@/lib/api/hooks/crm";
import { INDIAN_STATES } from "@/lib/accounting/indian-states";

const GST_RATES = ["0", "5", "12", "18", "28"] as const;

const lineItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  hsnSacCode: z.string(),
  quantity: z
    .string()
    .refine((v) => Number(v) > 0, { message: "Must be greater than 0" }),
  rate: z
    .string()
    .refine((v) => Number(v) >= 0, { message: "Must be 0 or more" }),
  gstRate: z.enum(GST_RATES),
});

const newBillSchema = z.object({
  vendorId: z.string().min(1, "Vendor is required"),
  vendorBillNumber: z.string(),
  billDate: z.string().min(1, "Bill date is required"),
  dueDate: z.string(),
  status: z.enum(["DRAFT", "POSTED"]),
  placeOfSupply: z.string(),
  vendorGstin: z.string(),
  supplierGstin: z.string(),
  reverseCharge: z.boolean(),
  discount: z
    .string()
    .refine((v) => Number(v) >= 0, { message: "Must be 0 or more" }),
  notes: z.string(),
  expenseAccountCode: z.string().min(1, "Expense account is required"),
  items: z.array(lineItemSchema).min(1, "At least one line item is required"),
});

type NewBillFormValues = z.infer<typeof newBillSchema>;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function num(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

interface ComputedTotals {
  subtotal: number;
  taxPool: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
  intra: boolean;
}

function computeTotals(
  items: NewBillFormValues["items"],
  supplierGstin: string,
  placeOfSupply: string,
  discount: string,
): ComputedTotals {
  const lines = items.map((it) => {
    const qty = num(it.quantity);
    const rate = num(it.rate);
    const gstRate = num(it.gstRate);
    const amount = round2(qty * rate);
    const tax = round2(amount * (gstRate / 100));
    return { amount, tax };
  });
  const subtotal = round2(lines.reduce((acc, l) => acc + l.amount, 0));
  const taxPool = round2(lines.reduce((acc, l) => acc + l.tax, 0));
  const supplierState =
    supplierGstin && supplierGstin.length >= 2
      ? supplierGstin.slice(0, 2)
      : placeOfSupply;
  const placeState = placeOfSupply || supplierState;
  const intra = supplierState !== "" && supplierState === placeState;
  const cgst = intra ? round2(taxPool / 2) : 0;
  const sgst = intra ? round2(taxPool - cgst) : 0;
  const igst = intra ? 0 : taxPool;
  const total = round2(subtotal + taxPool - num(discount));
  return { subtotal, taxPool, cgst, sgst, igst, total, intra };
}

export default function NewPurchaseBillPage() {
  const router = useRouter();
  const clientsQuery = useClientAccounts({});
  const accountsQuery = useAccounts({
    page: 1,
    pageSize: 500,
    activeOnly: true,
    type: "EXPENSE",
  });
  const createMutation = useCreatePurchaseBill();

  const [confirmPostOpen, setConfirmPostOpen] = useState<boolean>(false);

  const form = useForm<NewBillFormValues>({
    resolver: zodResolver(newBillSchema),
    defaultValues: {
      vendorId: "",
      vendorBillNumber: "",
      billDate: todayIso(),
      dueDate: "",
      status: "DRAFT",
      placeOfSupply: "",
      vendorGstin: "",
      supplierGstin: "",
      reverseCharge: false,
      discount: "0",
      notes: "",
      expenseAccountCode: "5990",
      items: [
        {
          description: "",
          hsnSacCode: "",
          quantity: "1",
          rate: "0",
          gstRate: "18",
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const watchedItems = form.watch("items");
  const watchedSupplierGstin = form.watch("supplierGstin");
  const watchedPlaceOfSupply = form.watch("placeOfSupply");
  const watchedDiscount = form.watch("discount");
  const watchedStatus = form.watch("status");

  const computed = useMemo(
    () =>
      computeTotals(
        watchedItems,
        watchedSupplierGstin,
        watchedPlaceOfSupply,
        watchedDiscount,
      ),
    [watchedItems, watchedSupplierGstin, watchedPlaceOfSupply, watchedDiscount],
  );

  function handleVendorChange(value: string): void {
    form.setValue("vendorId", value, { shouldValidate: true });
    const accounts = clientsQuery.data?.accounts ?? [];
    const vendor = accounts.find((c) => String(c.id) === value);
    if (vendor) {
      const gstin = (vendor as { gstin?: string | null }).gstin ?? null;
      const state = (vendor as { state?: string | null }).state ?? null;
      if (gstin && !form.getValues("vendorGstin")) {
        form.setValue("vendorGstin", gstin);
      }
      if (state && !form.getValues("placeOfSupply")) {
        const match = INDIAN_STATES.find(
          (s) => s.stateName.toLowerCase() === state.toLowerCase(),
        );
        if (match) form.setValue("placeOfSupply", match.stateCode);
      }
    }
  }

  function handleVendorGstinChange(
    e: React.ChangeEvent<HTMLInputElement>,
  ): void {
    form.setValue("vendorGstin", e.target.value.toUpperCase(), {
      shouldValidate: true,
    });
  }

  function handleSupplierGstinChange(
    e: React.ChangeEvent<HTMLInputElement>,
  ): void {
    form.setValue("supplierGstin", e.target.value.toUpperCase(), {
      shouldValidate: true,
    });
  }

  function handleReverseChargeChange(
    checked: boolean | "indeterminate",
  ): void {
    form.setValue("reverseCharge", checked === true);
  }

  function handleAddItem(): void {
    append({
      description: "",
      hsnSacCode: "",
      quantity: "1",
      rate: "0",
      gstRate: "18",
    });
  }

  function handleRemoveItemAt(index: number): () => void {
    return (): void => {
      if (fields.length > 1) remove(index);
    };
  }

  function handleCancel(): void {
    router.push("/accounting/purchase-bills");
  }

  function handleConfirmPost(): void {
    setConfirmPostOpen(false);
    void performCreate(form.getValues());
  }

  async function performCreate(values: NewBillFormValues): Promise<void> {
    const validItems = values.items.filter(
      (it) =>
        it.description.trim().length > 0 &&
        num(it.quantity) > 0 &&
        num(it.rate) >= 0,
    );
    const payload: CreatePurchaseBillInput = {
      vendorId: Number(values.vendorId),
      vendorBillNumber: values.vendorBillNumber.trim() || undefined,
      billDate: values.billDate,
      dueDate: values.dueDate || undefined,
      status: values.status,
      placeOfSupply: values.placeOfSupply || undefined,
      vendorGstin: values.vendorGstin.trim() || undefined,
      supplierGstin: values.supplierGstin.trim() || undefined,
      reverseCharge: values.reverseCharge,
      discount: num(values.discount),
      notes: values.notes.trim() || undefined,
      expenseAccountCode: values.expenseAccountCode,
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
      const message =
        error instanceof Error ? error.message : "Failed to create bill";
      toast.error(message);
    }
  }

  function onSubmit(values: NewBillFormValues): void {
    if (values.status === "POSTED") {
      setConfirmPostOpen(true);
      return;
    }
    void performCreate(values);
  }

  if (clientsQuery.isLoading || accountsQuery.isLoading) {
    return <LoadingState variant="form" />;
  }
  if (clientsQuery.error) {
    return <ErrorState description={clientsQuery.error.message} />;
  }
  if (accountsQuery.error) {
    return <ErrorState description={accountsQuery.error.message} />;
  }

  const vendors = clientsQuery.data?.accounts ?? [];
  const expenseAccounts = accountsQuery.data?.items ?? [];

  return (
    <PageWrapper
      eyebrow="Accounting · Purchase Bills"
      title="New purchase bill"
      subtitle="Record a vendor bill. Posting credits AP and debits the chosen expense account + Input GST."
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Card className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="vendorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendor</FormLabel>
                    <Select value={field.value} onValueChange={handleVendorChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select vendor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-72">
                        {vendors.map((v) => (
                          <SelectItem key={v.id} value={String(v.id)}>
                            {v.clientName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="vendorBillNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendor bill #</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="As printed on the bill" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="DRAFT">Draft</SelectItem>
                        <SelectItem value="POSTED">Post immediately</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="billDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bill date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="expenseAccountCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expense account</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-72">
                        {expenseAccounts.map((acc) => (
                          <SelectItem key={acc.id} value={acc.code}>
                            {acc.code} — {acc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </Card>

          <Card className="p-4">
            <div className="text-sm font-medium mb-3">GST</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="placeOfSupply"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Place of supply</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select state" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-72">
                        {INDIAN_STATES.map((s) => (
                          <SelectItem key={s.stateCode} value={s.stateCode}>
                            {s.stateCode} — {s.stateName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="vendorGstin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendor GSTIN</FormLabel>
                    <FormControl>
                      <Input
                        name={field.name}
                        value={field.value}
                        onBlur={field.onBlur}
                        ref={field.ref}
                        onChange={handleVendorGstinChange}
                        placeholder="15-char GSTIN"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="supplierGstin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your GSTIN</FormLabel>
                    <FormControl>
                      <Input
                        name={field.name}
                        value={field.value}
                        onBlur={field.onBlur}
                        ref={field.ref}
                        onChange={handleSupplierGstinChange}
                        placeholder="15-char GSTIN"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="sm:col-span-3">
                <FormField
                  control={form.control}
                  name="reverseCharge"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormControl>
                        <Checkbox
                          id="reverse-charge"
                          checked={field.value}
                          onCheckedChange={handleReverseChargeChange}
                        />
                      </FormControl>
                      <FormLabel
                        htmlFor="reverse-charge"
                        className="text-sm cursor-pointer leading-none"
                      >
                        Reverse charge applies
                      </FormLabel>
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <Table className="min-w-[760px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-[100px]">HSN/SAC</TableHead>
                    <TableHead className="text-right w-[100px]">Qty</TableHead>
                    <TableHead className="text-right w-[120px]">Rate</TableHead>
                    <TableHead className="w-[100px]">GST %</TableHead>
                    <TableHead className="text-right w-[120px]">Amount</TableHead>
                    <TableHead className="w-[60px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((field, index) => {
                    const qty = num(watchedItems[index]?.quantity ?? "0");
                    const rate = num(watchedItems[index]?.rate ?? "0");
                    const amount = round2(qty * rate);
                    return (
                      <TableRow key={field.id}>
                        <TableCell>
                          <Controller
                            control={form.control}
                            name={`items.${index}.description`}
                            render={({ field: f, fieldState }) => (
                              <div>
                                <Input
                                  {...f}
                                  placeholder="What is this for?"
                                />
                                {fieldState.error && (
                                  <p className="text-xs text-destructive mt-0.5">
                                    {fieldState.error.message}
                                  </p>
                                )}
                              </div>
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <Controller
                            control={form.control}
                            name={`items.${index}.hsnSacCode`}
                            render={({ field: f }) => <Input {...f} />}
                          />
                        </TableCell>
                        <TableCell>
                          <Controller
                            control={form.control}
                            name={`items.${index}.quantity`}
                            render={({ field: f, fieldState }) => (
                              <div>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  {...f}
                                  className="text-right tabular-nums"
                                />
                                {fieldState.error && (
                                  <p className="text-xs text-destructive mt-0.5">
                                    {fieldState.error.message}
                                  </p>
                                )}
                              </div>
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <Controller
                            control={form.control}
                            name={`items.${index}.rate`}
                            render={({ field: f, fieldState }) => (
                              <div>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  {...f}
                                  className="text-right tabular-nums"
                                />
                                {fieldState.error && (
                                  <p className="text-xs text-destructive mt-0.5">
                                    {fieldState.error.message}
                                  </p>
                                )}
                              </div>
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <Controller
                            control={form.control}
                            name={`items.${index}.gstRate`}
                            render={({ field: f }) => (
                              <Select
                                value={f.value}
                                onValueChange={f.onChange}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {GST_RATES.map((r) => (
                                    <SelectItem key={r} value={r}>
                                      {r}%
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          />
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {amount.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={handleRemoveItemAt(index)}
                            disabled={fields.length <= 1}
                            aria-label="Remove line item"
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
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddItem}
              >
                <Plus className="size-4 mr-1" />
                Add line
              </Button>
            </div>
          </Card>

          <Card className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={3} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="mt-4">
                  <FormField
                    control={form.control}
                    name="discount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Discount</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            {...field}
                            className="max-w-xs"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              <div className="space-y-1 text-sm tabular-nums">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{computed.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Discount</span>
                  <span>−{num(watchedDiscount).toFixed(2)}</span>
                </div>
                {computed.intra && computed.cgst > 0 && (
                  <div className="flex justify-between">
                    <span>CGST</span>
                    <span>{computed.cgst.toFixed(2)}</span>
                  </div>
                )}
                {computed.intra && computed.sgst > 0 && (
                  <div className="flex justify-between">
                    <span>SGST</span>
                    <span>{computed.sgst.toFixed(2)}</span>
                  </div>
                )}
                {!computed.intra && computed.igst > 0 && (
                  <div className="flex justify-between">
                    <span>IGST</span>
                    <span>{computed.igst.toFixed(2)}</span>
                  </div>
                )}
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
              onClick={handleCancel}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="w-full sm:w-auto"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending
                ? "Saving…"
                : watchedStatus === "POSTED"
                  ? "Create and post"
                  : "Save as draft"}
            </Button>
          </div>
        </form>
      </Form>

      <ConfirmDialog
        open={confirmPostOpen}
        onOpenChange={setConfirmPostOpen}
        title="Post this bill immediately?"
        description="Posting records journal entries (AP, expense, and Input GST) and locks the bill. This cannot be undone. Continue?"
        confirmLabel="Create and post"
        isPending={createMutation.isPending}
        onConfirm={handleConfirmPost}
      />
    </PageWrapper>
  );
}
