"use client";

import { Trash2 } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";
import type { JournalFormValues } from "./journal-schema";

interface JournalLineRowsProps {
  form: UseFormReturn<JournalFormValues>;
  accountOptions: ComboboxOption[];
  fields: ReadonlyArray<{ id: string }>;
  offendingLineIndex: number | null;
  onRemove: (index: number) => void;
}

export function JournalLineRows({
  form,
  accountOptions,
  fields,
  offendingLineIndex,
  onRemove,
}: JournalLineRowsProps) {
  return (
    <div className="flex flex-col gap-2">
      {fields.map((field, index) => (
        <div
          key={field.id}
          className={cn(
            "grid gap-2 rounded-lg border border-border bg-card p-3",
            "sm:grid-cols-[minmax(0,2fr)_8rem_minmax(0,1fr)_minmax(0,1.5fr)_2rem]",
            offendingLineIndex === index && "border-destructive ring-1 ring-destructive",
          )}
        >
          <FormField
            control={form.control}
            name={`lines.${index}.accountId`}
            render={({ field: accountField }) => (
              <FormItem>
                <FormLabel className="sr-only">Account for line {index + 1}</FormLabel>
                <FormControl>
                  <Combobox
                    options={accountOptions}
                    value={accountField.value}
                    onChange={accountField.onChange}
                    placeholder="Pick an account"
                    searchPlaceholder="Search accounts…"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name={`lines.${index}.side`}
            render={({ field: sideField }) => (
              <FormItem>
                <FormLabel className="sr-only">Side for line {index + 1}</FormLabel>
                <Select value={sideField.value} onValueChange={sideField.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
                    <SelectItem value="debit">Debit</SelectItem>
                    <SelectItem value="credit">Credit</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name={`lines.${index}.amount`}
            render={({ field: amountField }) => (
              <FormItem>
                <FormLabel className="sr-only">Amount for line {index + 1}</FormLabel>
                <FormControl>
                  <Input
                    inputMode="decimal"
                    placeholder="0.00"
                    className="text-right font-mono tabular-nums"
                    {...amountField}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name={`lines.${index}.description`}
            render={({ field: noteField }) => (
              <FormItem>
                <FormLabel className="sr-only">Note for line {index + 1}</FormLabel>
                <FormControl>
                  <Input placeholder="Note (optional)" {...noteField} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 justify-self-end text-muted-foreground"
            aria-label={`Remove line ${index + 1}`}
            disabled={fields.length <= 2}
            onClick={() => onRemove(index)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}
