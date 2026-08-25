"use client";

import { useFieldArray, type UseFormReturn } from "react-hook-form";
import { Trash2 } from "lucide-react";
import { PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Button } from "@/components/ui/button";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import { statusToneClasses } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { TAX_CATEGORY_OPTIONS } from "./ar-labels";
import { emptyArLine, type ArDocumentFormValues } from "./ar-document-schema";

interface ArDocumentLineEditorProps {
  form: UseFormReturn<ArDocumentFormValues>;
  errorLineIndex?: number;
  disabled?: boolean;
}

const GRID = "grid grid-cols-1 gap-2 md:grid-cols-[3fr_1fr_1.4fr_1.2fr_1.6fr_1.2fr_auto]";

export function ArDocumentLineEditor({
  form,
  errorLineIndex,
  disabled = false,
}: ArDocumentLineEditorProps) {
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "lines" });
  const danger = statusToneClasses("danger");
  const linesError = form.formState.errors.lines?.message;

  return (
    <div className="space-y-3">
      <div
        className={cn(
          GRID,
          "hidden px-2 text-micro font-bold uppercase tracking-wider text-muted-foreground md:grid",
        )}
      >
        <span>What you are billing for</span>
        <span>Qty</span>
        <span>Unit price</span>
        <span>Discount</span>
        <span>Tax treatment</span>
        <span>HSN / code</span>
        <span className="sr-only">Remove</span>
      </div>

      {fields.map((field, index) => (
        <div
          key={field.id}
          className={cn(
            GRID,
            "items-start rounded-md border border-border/70 bg-card p-2",
            errorLineIndex === index ? cn(danger.rule, danger.surface) : null,
          )}
        >
          <FormField
            control={form.control}
            name={`lines.${index}.description`}
            render={({ field: lineField }) => (
              <FormItem>
                <FormLabel className="md:sr-only">What you are billing for</FormLabel>
                <FormControl>
                  <Input {...lineField} placeholder="Design retainer, March" disabled={disabled} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name={`lines.${index}.quantity`}
            render={({ field: lineField }) => (
              <FormItem>
                <FormLabel className="md:sr-only">Qty</FormLabel>
                <FormControl>
                  <Input
                    {...lineField}
                    inputMode="decimal"
                    className="text-right font-mono"
                    disabled={disabled}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name={`lines.${index}.unitPrice`}
            render={({ field: lineField }) => (
              <FormItem>
                <FormLabel className="md:sr-only">Unit price</FormLabel>
                <FormControl>
                  <Input
                    {...lineField}
                    inputMode="decimal"
                    placeholder="0.00"
                    className="text-right font-mono"
                    disabled={disabled}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name={`lines.${index}.discount`}
            render={({ field: lineField }) => (
              <FormItem>
                <FormLabel className="md:sr-only">Discount</FormLabel>
                <FormControl>
                  <Input
                    {...lineField}
                    inputMode="decimal"
                    placeholder="0.00"
                    className="text-right font-mono"
                    disabled={disabled}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name={`lines.${index}.taxCategory`}
            render={({ field: lineField }) => (
              <FormItem>
                <FormLabel className="md:sr-only">Tax treatment</FormLabel>
                <Select
                  value={lineField.value}
                  onValueChange={lineField.onChange}
                  disabled={disabled}
                >
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
            render={({ field: lineField }) => (
              <FormItem>
                <FormLabel className="md:sr-only">HSN / code</FormLabel>
                <FormControl>
                  <Input
                    {...lineField}
                    placeholder="998314"
                    className="font-mono"
                    disabled={disabled}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex justify-end md:pt-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              aria-label={`Remove line ${index + 1}`}
              disabled={disabled || fields.length === 1}
              onClick={() => remove(index)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}

      {linesError ? (
        <p className="text-xs text-destructive" role="alert">
          {linesError}
        </p>
      ) : null}

      <AnimatedIconButton
        icon={PlusIcon}
        iconSize={16}
        iconClassName="mr-1.5"
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => append(emptyArLine())}
      >
        Add a line
      </AnimatedIconButton>
    </div>
  );
}
