"use client";

import { useCallback, useMemo } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { AppSheet } from "@/components/shared/app-sheet";
import { LoadingButton } from "@/components/ui/loading-button";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useOpeningStock } from "@/hooks/api/inventory/stock";
import { useProductVariants } from "@/hooks/api/inventory/products";
import { useWarehouses } from "@/hooks/api/inventory/warehouses";
import { getErrorMessage } from "@/lib/get-error-message";
import { formSchema, defaultLine, type FormValues } from "./opening-stock-schema";
import { LineRow } from "./opening-stock-line-row";

interface OpeningStockSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function OpeningStockSheet({ open, onOpenChange }: OpeningStockSheetProps) {
  const { data: variants = [], isLoading: variantsLoading } = useProductVariants({ activeOnly: true });
  const { data: warehouses = [] } = useWarehouses();

  const openingMutation = useOpeningStock();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { lines: [defaultLine()], notes: "" },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lines",
  });

  const watchedLines = form.watch("lines");

  const summary = useMemo(() => {
    const totalQty = watchedLines.reduce((sum, l) => {
      const n = Number(l.qty);
      return sum + (isNaN(n) ? 0 : n);
    }, 0);
    const totalValue = watchedLines.reduce((sum, l) => {
      const q = Number(l.qty);
      const c = Number(l.unitCost);
      if (isNaN(q) || isNaN(c)) return sum;
      return sum + q * c;
    }, 0);
    return { lines: watchedLines.length, totalQty, totalValue };
  }, [watchedLines]);

  const handleAddLine = useCallback(() => {
    append(defaultLine());
  }, [append]);

  const handleRemoveLine = useCallback(
    (index: number) => {
      if (fields.length > 1) remove(index);
    },
    [fields.length, remove],
  );

  function handleOpenChange(v: boolean): void {
    if (!v) {
      form.reset({ lines: [defaultLine()], notes: "" });
    }
    onOpenChange(v);
  }

  function handleCancel(): void {
    handleOpenChange(false);
  }

  function handleSubmit(values: FormValues): void {
    const payload = {
      lines: values.lines.map((l) => ({
        productVariantId: Number(l.variantId),
        locationId: Number(l.locationId),
        qty: Number(l.qty),
        ...(l.unitCost !== "" ? { unitCost: Number(l.unitCost) } : {}),
      })),
      notes: values.notes?.trim() || undefined,
    };

    openingMutation.mutate(payload, {
      onSuccess: () => {
        toast.success("Opening stock recorded");
        handleOpenChange(false);
      },
      onError: (err) => {
        toast.error(getErrorMessage(err));
      },
    });
  }

  const linesError = form.formState.errors.lines;
  const rootLinesError = linesError && "message" in linesError ? linesError.message : undefined;

  return (
    <AppSheet
      open={open}
      onOpenChange={handleOpenChange}
      title="Opening Stock"
      description="Record initial inventory balances. This creates stock movements and affects on-hand quantities."
      className="sm:max-w-2xl"
      footer={
        <div className="flex w-full gap-2">
          <Button type="button" variant="outline" size="sm" className="flex-1" onClick={handleCancel}>
            Cancel
          </Button>
          <LoadingButton
            size="sm"
            className="flex-1"
            isPending={openingMutation.isPending}
            loadingText="Saving…"
            onClick={form.handleSubmit(handleSubmit)}
            disabled={variantsLoading}
          >
            Record Opening Stock
          </LoadingButton>
        </div>
      }
    >
      <Form {...form}>
      <div className="space-y-4">
        <div className="flex items-start gap-2 rounded-md border border-status-warning-rule bg-status-warning-surface px-3 py-2">
          <AlertTriangle className="h-4 w-4 text-status-warning-ink shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-xs text-status-warning-ink">
            Opening stock creates inventory balances and stock movements. Review all lines before submitting.
          </p>
        </div>

        {rootLinesError && (
          <p className="text-xs text-destructive">{rootLinesError}</p>
        )}

        {warehouses.length === 0 && (
          <div className="rounded-md border border-border bg-muted/40 px-3 py-3 text-center">
            <p className="text-sm font-medium text-foreground">No warehouses configured</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Set up a warehouse before recording opening stock.
            </p>
          </div>
        )}

        {variants.length === 0 && !variantsLoading && (
          <div className="rounded-md border border-border bg-muted/40 px-3 py-3 text-center">
            <p className="text-sm font-medium text-foreground">No active products</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Create and activate products before recording stock.
            </p>
          </div>
        )}

        <div className="space-y-2">
          {fields.map((field, index) => (
            <LineRow
              key={field.id}
              index={index}
              control={form.control}
              register={form.register}
              watch={form.watch}
              setValue={form.setValue}
              errors={form.formState.errors}
              onRemove={handleRemoveLine}
              canRemove={fields.length > 1}
              warehouses={warehouses}
            />
          ))}

          <AnimatedIconButton
            type="button"
            icon={PlusIcon}
            iconSize={14}
            iconClassName="mr-1"
            variant="outline"
            size="sm"
            className="w-full h-8 text-xs border-dashed"
            onClick={handleAddLine}
          >
            Add Line
          </AnimatedIconButton>
        </div>

        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-xs text-muted-foreground">Lines</p>
            <p className="text-sm font-medium tabular-nums">{summary.lines}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Qty</p>
            <p className="text-sm font-medium tabular-nums">{summary.totalQty.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Est. Value</p>
            <p className="text-sm font-medium tabular-nums">
              {summary.totalValue > 0
                ? summary.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                : "—"}
            </p>
          </div>
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Notes (optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Add notes about this opening stock entry…"
                  maxLength={500}
                  rows={2}
                  className="text-xs resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      </Form>
    </AppSheet>
  );
}
