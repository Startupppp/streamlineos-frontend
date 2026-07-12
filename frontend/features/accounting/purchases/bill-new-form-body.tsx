"use client";

import { Controller } from "react-hook-form";
import type { UseFormReturn, UseFieldArrayReturn } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { GST_RATES, num, round2 } from "./bill-form-schemas";
import type { NewBillFormValues, ComputedTotals } from "./bill-form-schemas";
import { INDIAN_STATES } from "@/lib/accounting/indian-states";

interface Account {
  id: number;
  code: string;
  name: string;
}

interface Vendor {
  id: number;
  clientName: string;
}

interface BillNewFormBodyProps {
  form: UseFormReturn<NewBillFormValues>;
  fields: UseFieldArrayReturn<NewBillFormValues, "items">["fields"];
  vendors: Vendor[];
  expenseAccounts: Account[];
  computed: ComputedTotals;
  watchedItems: NewBillFormValues["items"];
  watchedDiscount: string;
  watchedStatus: "DRAFT" | "POSTED";
  isPending: boolean;
  onVendorChange: (value: string) => void;
  onVendorGstinChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSupplierGstinChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onReverseChargeChange: (checked: boolean | "indeterminate") => void;
  onAddItem: () => void;
  onRemoveItemAt: (index: number) => () => void;
  onCancel: () => void;
}

export function BillNewFormBody({
  form,
  fields,
  vendors,
  expenseAccounts,
  computed,
  watchedItems,
  watchedDiscount,
  watchedStatus,
  isPending,
  onVendorChange,
  onVendorGstinChange,
  onSupplierGstinChange,
  onReverseChargeChange,
  onAddItem,
  onRemoveItemAt,
  onCancel,
}: BillNewFormBodyProps) {
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="vendorId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vendor</FormLabel>
                <Select value={field.value} onValueChange={onVendorChange}>
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
                  <DatePicker
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    placeholder="Pick a date"
                    className="h-8 text-sm"
                  />
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
                  <DatePicker
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    placeholder="Pick a date"
                    className="h-8 text-sm"
                  />
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
                    onChange={onVendorGstinChange}
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
                    onChange={onSupplierGstinChange}
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
                      onCheckedChange={onReverseChargeChange}
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
                            <Input {...f} placeholder="What is this for?" />
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
                          <Select value={f.value} onValueChange={f.onChange}>
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
                        onClick={onRemoveItemAt(index)}
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
          <Button type="button" variant="outline" size="sm" onClick={onAddItem}>
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
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="w-full sm:w-auto"
          disabled={isPending}
        >
          {isPending
            ? "Saving…"
            : watchedStatus === "POSTED"
              ? "Create and post"
              : "Save as draft"}
        </Button>
      </div>
    </div>
  );
}
