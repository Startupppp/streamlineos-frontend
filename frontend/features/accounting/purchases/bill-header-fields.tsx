"use client";

import { useFormContext } from "react-hook-form";
import { DatePicker } from "@/components/ui/date-picker";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import type { NewBillFormValues } from "./bill-form-schemas";

interface BillHeaderFieldsProps {
  vendors: Array<{ id: number; clientName: string }>;
  expenseAccounts: Array<{ id: number; code: string; name: string }>;
  onVendorChange: (value: string) => void;
}

export function BillHeaderFields({
  vendors,
  expenseAccounts,
  onVendorChange,
}: BillHeaderFieldsProps) {
  const form = useFormContext<NewBillFormValues>();

  return (
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
                  className="text-sm"
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
                  className="text-sm"
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
  );
}
