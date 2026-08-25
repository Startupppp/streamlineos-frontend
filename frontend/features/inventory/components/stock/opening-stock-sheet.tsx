"use client";

import { memo, useCallback, useMemo } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { PlusIcon, Trash2Icon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { AppSheet } from "@/components/shared/app-sheet";
import { LoadingButton } from "@/components/ui/loading-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProductVariantCombobox } from "@/components/inventory/product-variant-combobox";
import { useOpeningStock } from "@/hooks/api/inventory/stock";
import { useProductVariants } from "@/hooks/api/inventory/products";
import { useWarehouses, useLocations } from "@/hooks/api/inventory/warehouses";
import { getErrorMessage } from "@/lib/get-error-message";

const lineSchema = z.object({
  variantId: z.string().min(1, "Select a product variant."),
  warehouseId: z.string().min(1, "Select a warehouse."),
  locationId: z.string().min(1, "Select a location."),
  qty: z
    .string()
    .min(1, "Quantity must be greater than 0.")
    .refine((v) => {
      const n = Number(v);
      return !isNaN(n) && n > 0;
    }, "Quantity must be greater than 0."),
  unitCost: z
    .string()
    .refine((v) => {
      if (v === "" || v === undefined) return true;
      const n = Number(v);
      return !isNaN(n) && n >= 0;
    }, "Unit cost must be 0 or greater."),
});

const formSchema = z
  .object({
    lines: z
      .array(lineSchema)
      .min(1, "Add at least one stock line.")
      .superRefine((lines, ctx) => {
        const seen = new Set<string>();
        lines.forEach((l, i) => {
          const key = `${l.variantId}:${l.locationId}`;
          if (seen.has(key)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Duplicate variant/location combination.",
              path: [i, "variantId"],
            });
          } else {
            seen.add(key);
          }
        });
      }),
    notes: z.string().max(500).optional(),
  });

type FormValues = z.infer<typeof formSchema>;

function defaultLine() {
  return { variantId: "", warehouseId: "", locationId: "", qty: "", unitCost: "" };
}

interface OpeningStockSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

interface LineRowProps {
  index: number;
  control: ReturnType<typeof useForm<FormValues>>["control"];
  register: ReturnType<typeof useForm<FormValues>>["register"];
  watch: ReturnType<typeof useForm<FormValues>>["watch"];
  setValue: ReturnType<typeof useForm<FormValues>>["setValue"];
  errors: ReturnType<typeof useForm<FormValues>>["formState"]["errors"];
  onRemove: (index: number) => void;
  canRemove: boolean;
  warehouses: { id: number; name: string }[];
}

const LineRow = memo(function LineRow({
  index,
  control,
  register,
  watch,
  setValue,
  errors,
  onRemove,
  canRemove,
  warehouses,
}: LineRowProps) {
  const warehouseId = watch(`lines.${index}.warehouseId`);
  const { data: locations = [] } = useLocations(Number(warehouseId) || 0);

  const lineErrors = errors.lines?.[index];

  const handleWarehouseChange = useCallback(
    (val: string) => {
      setValue(`lines.${index}.warehouseId`, val, { shouldValidate: true });
      setValue(`lines.${index}.locationId`, "", { shouldValidate: false });
    },
    [index, setValue],
  );

  const handleLocationChange = useCallback(
    (val: string) => {
      setValue(`lines.${index}.locationId`, val, { shouldValidate: true });
    },
    [index, setValue],
  );

  const handleRemove = useCallback(() => onRemove(index), [index, onRemove]);

  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-muted-foreground">Line {index + 1}</span>
        {canRemove && (
          <AnimatedIconButton
            type="button"
            icon={Trash2Icon}
            iconSize={14}
            iconClassName="mr-1"
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleRemove}
          >
            Remove
          </AnimatedIconButton>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2 space-y-1">
          <Label className="text-xs text-muted-foreground">Variant <span className="text-destructive">*</span></Label>
          <Controller
            control={control}
            name={`lines.${index}.variantId`}
            render={({ field }) => (
              <ProductVariantCombobox
                value={field.value}
                onChange={field.onChange}
                className="text-xs"
              />
            )}
          />
          {lineErrors?.variantId && (
            <p className="text-xs text-destructive">{lineErrors.variantId.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Warehouse <span className="text-destructive">*</span></Label>
          <Controller
            control={control}
            name={`lines.${index}.warehouseId`}
            render={({ field }) => (
              <Select value={field.value} onValueChange={handleWarehouseChange}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Select warehouse…" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={String(w.id)}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {lineErrors?.warehouseId && (
            <p className="text-xs text-destructive">{lineErrors.warehouseId.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Location <span className="text-destructive">*</span></Label>
          <Controller
            control={control}
            name={`lines.${index}.locationId`}
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={handleLocationChange}
                disabled={!warehouseId}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder={!warehouseId ? "Select warehouse first" : "Select location…"} />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={String(l.id)}>
                      {l.name} ({l.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {lineErrors?.locationId && (
            <p className="text-xs text-destructive">{lineErrors.locationId.message}</p>
          )}
          {!warehouseId && !lineErrors?.locationId && (
            <p className="text-xs text-muted-foreground">Select a warehouse first.</p>
          )}
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Quantity <span className="text-destructive">*</span></Label>
          <Input
            type="number"
            min="0.0001"
            step="any"
            placeholder="Enter quantity"
            className="text-xs"
            {...register(`lines.${index}.qty`)}
          />
          {lineErrors?.qty && (
            <p className="text-xs text-destructive">{lineErrors.qty.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Unit Cost (optional)</Label>
          <Input
            type="number"
            min="0"
            step="any"
            placeholder="0.00"
            className="text-xs"
            {...register(`lines.${index}.unitCost`)}
          />
          {lineErrors?.unitCost && (
            <p className="text-xs text-destructive">{lineErrors.unitCost.message}</p>
          )}
        </div>
      </div>
    </div>
  );
});

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
