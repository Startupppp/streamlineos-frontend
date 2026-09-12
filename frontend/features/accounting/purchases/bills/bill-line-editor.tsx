"use client";

import { useMemo } from "react";
import { useFieldArray, type UseFormReturn } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import { CONTENT_PANEL_SOLID } from "@/components/ui/content-fill-panel";
import { cn } from "@/lib/utils";
import { usePostableAccounts } from "@/hooks/api/accounting/ledger";
import { TAX_CATEGORY_OPTIONS } from "../lib/ap-labels";
import { EMPTY_BILL_LINE, type BillFormValues } from "./bill-form-schema";

interface BillLineEditorProps {
  form: UseFormReturn<BillFormValues>;
  currency: string;
}

export function BillLineEditor({ form, currency }: BillLineEditorProps) {
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "lines" });
  const accountsQuery = usePostableAccounts();

  const accountOptions = useMemo<ComboboxOption[]>(
    () =>
      (accountsQuery.data ?? [])
        .filter((account) => account.accountType === "EXPENSE" || account.accountType === "ASSET")
        .map((account) => ({ value: account.id, label: account.name, sublabel: account.code })),
    [accountsQuery.data],
  );

  function handleAddLine(): void {
    append({ ...EMPTY_BILL_LINE });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">What you were billed for</h2>
          <p className="text-label text-muted-foreground">
            Prices are in {currency}. Totals and tax are worked out by the books, not here.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={handleAddLine}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add line
        </Button>
      </div>

      {fields.map((field, index) => (
        <div key={field.id} className={cn(CONTENT_PANEL_SOLID, "space-y-3 p-4")}>
          <div className="flex items-start gap-2">
            <FormField
              control={form.control}
              name={`lines.${index}.description`}
              render={({ field: descriptionField }) => (
                <FormItem className="min-w-0 flex-1">
                  <FormLabel>Line {index + 1}</FormLabel>
                  <FormControl>
                    <Input {...descriptionField} placeholder="Monthly hosting" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="mt-6 h-7 w-7 shrink-0"
              aria-label={`Remove line ${index + 1}`}
              disabled={fields.length === 1}
              onClick={() => remove(index)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <FormField
              control={form.control}
              name={`lines.${index}.quantity`}
              render={({ field: quantityField }) => (
                <FormItem>
                  <FormLabel>Quantity</FormLabel>
                  <FormControl>
                    <Input {...quantityField} inputMode="decimal" className="tabular-nums" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={`lines.${index}.unitPrice`}
              render={({ field: priceField }) => (
                <FormItem>
                  <FormLabel>Price each ({currency})</FormLabel>
                  <FormControl>
                    <Input
                      {...priceField}
                      inputMode="decimal"
                      placeholder="0.00"
                      className="tabular-nums"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={`lines.${index}.discount`}
              render={({ field: discountField }) => (
                <FormItem>
                  <FormLabel>Discount ({currency})</FormLabel>
                  <FormControl>
                    <Input
                      {...discountField}
                      inputMode="decimal"
                      className="tabular-nums"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <FormField
              control={form.control}
              name={`lines.${index}.taxCategory`}
              render={({ field: categoryField }) => (
                <FormItem>
                  <FormLabel>Tax treatment</FormLabel>
                  <Select value={categoryField.value} onValueChange={categoryField.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
                      {TAX_CATEGORY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
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
              name={`lines.${index}.commodityCode`}
              render={({ field: codeField }) => (
                <FormItem>
                  <FormLabel>Item code</FormLabel>
                  <FormControl>
                    <Input
                      {...codeField}
                      placeholder="998314"
                      maxLength={32}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name={`lines.${index}.expenseAccountId`}
            render={({ field: accountField }) => (
              <FormItem>
                <FormLabel>Where this spending goes</FormLabel>
                <FormControl>
                  <Combobox
                    options={accountOptions}
                    value={accountField.value ?? ""}
                    onChange={accountField.onChange}
                    placeholder="Use the vendor's usual account"
                    searchPlaceholder="Search accounts…"
                    emptyText="No matching account."
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name={`lines.${index}.capitalize`}
            render={({ field: capitalizeField }) => (
              <FormItem className="flex flex-row items-center justify-between gap-3">
                <FormLabel>This is something we own, not a running cost</FormLabel>
                <FormControl>
                  <Switch
                    checked={capitalizeField.value}
                    onCheckedChange={capitalizeField.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
      ))}
    </div>
  );
}
