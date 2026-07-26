"use client";

import { useCallback, useMemo, forwardRef } from "react";
import {
  useWatch,
  useFieldArray,
  useFormContext,
  Controller,
  type FieldValues,
  type Control,
} from "react-hook-form";
import { PlusIcon, Trash2Icon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { toNum, round2 } from "@/features/inventory/lib/order-line-helpers";

export interface OrderLineVariant {
  id: number;
  productName: string;
  name: string;
  sku: string;
  costPrice?: string | number | null;
}

export type OrderLineMode = "po" | "so";

type FieldRow = { id: string; index: number };

interface AmountCellProps {
  index: number;
  control: Control<FieldValues>;
  priceField: string;
  includesTax: boolean;
}

function AmountCell({ index, control, priceField, includesTax }: AmountCellProps) {
  const quantity = useWatch({ control, name: `lines.${index}.quantity` }) as string | undefined;
  const price = useWatch({ control, name: `lines.${index}.${priceField}` }) as string | undefined;
  const taxRate = useWatch({ control, name: `lines.${index}.taxRate` }) as string | undefined;

  const sub = round2(toNum(quantity ?? "") * toNum(price ?? ""));
  const total = includesTax
    ? round2(sub + round2(sub * (toNum(taxRate ?? "") / 100)))
    : sub;
  return <span>{total.toFixed(2)}</span>;
}

function truncateLabel(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

interface RemoveLineButtonProps {
  index: number;
  disabled: boolean;
  onRemove: (index: number) => void;
}

const RemoveLineButton = forwardRef<HTMLButtonElement, RemoveLineButtonProps>(
  function RemoveLineButton({ index, disabled, onRemove }, _ref) {
    function handleClick(): void {
      onRemove(index);
    }
    return (
      <AnimatedIconButton
        type="button"
        icon={Trash2Icon}
        iconSize={14}
        variant="ghost"
        size="icon"
        className="w-7"
        onClick={handleClick}
        disabled={disabled}
        aria-label={`Remove line ${index + 1}`}
      />
    );
  },
);

export interface OrderLineTableProps {
  variants: OrderLineVariant[];
  mode: OrderLineMode;
  onVariantChange?: (index: number, variantId: string, price: string) => void;
  priceLabel?: string;
  amountLabel?: string;
  footer?: React.ReactNode;
  minWidth?: string;
}

export function OrderLineTable({
  variants,
  mode,
  onVariantChange,
  priceLabel,
  amountLabel,
  footer,
  minWidth,
}: OrderLineTableProps) {
  const { control } = useFormContext();
  const { fields, append, remove } = useFieldArray({ control, name: "lines" });
  const isPo = mode === "po";
  const resolvedPriceLabel = priceLabel ?? (isPo ? "Unit Cost" : "Unit Price");
  const resolvedAmountLabel = amountLabel ?? (isPo ? "Amount" : "Line Total");
  const priceField = isPo ? "unitCost" : "unitPrice";

  const handleRemoveAt = useCallback((index: number): void => {
    remove(index);
  }, [remove]);

  function handleAddLine(): void {
    const newLine: Record<string, string> = {
      variantId: "",
      quantity: "1",
      taxRate: "0",
      [priceField]: "0",
    };
    append(newLine);
  }

  const fieldRows: FieldRow[] = useMemo(
    () => fields.map((f, i) => ({ id: f.id, index: i })),
    [fields],
  );

  const canRemoveLine = fields.length > 1;

  const columns = useMemo<DataTableColumn<FieldRow>[]>(() => [
    {
      key: "variant",
      header: "Product / SKU",
      cell: (row) => (
        <Controller
          control={control}
          name={`lines.${row.index}.variantId`}
          render={({ field: f, fieldState }) => (
            <div>
              <Select
                value={f.value as string}
                onValueChange={(value) => {
                  f.onChange(value);
                  if (onVariantChange) {
                    const variant = variants.find((v) => String(v.id) === value);
                    const price = variant?.costPrice
                      ? String(Number(variant.costPrice).toFixed(2))
                      : "0";
                    onVariantChange(row.index, value, price);
                  }
                }}
              >
                <SelectTrigger className={`text-xs ${fieldState.error ? "border-destructive" : ""}`}>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent className="max-h-72 min-w-[var(--radix-select-trigger-width)]">
                  {variants.map((v) => {
                    const label = isPo
                      ? `${v.productName} — ${v.sku}`
                      : `${v.productName} – ${v.name} (${v.sku})`;
                    return (
                      <SelectItem key={v.id} value={String(v.id)} title={label}>
                        {truncateLabel(label, 50)}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {fieldState.error && (
                <p className="text-[10px] text-destructive mt-0.5">{fieldState.error.message}</p>
              )}
            </div>
          )}
        />
      ),
    },
    {
      key: "quantity",
      header: "Qty",
      headerClassName: "text-right w-[90px]",
      className: "w-[90px]",
      cell: (row) => (
        <Controller
          control={control}
          name={`lines.${row.index}.quantity`}
          render={({ field: f, fieldState }) => (
            <div>
              <Input
                type="number"
                min="0.0001"
                step="1"
                className={`text-right tabular-nums text-xs ${fieldState.error ? "border-destructive" : ""}`}
                {...f}
              />
              {fieldState.error && (
                <p className="text-[10px] text-destructive mt-0.5">{fieldState.error.message}</p>
              )}
            </div>
          )}
        />
      ),
    },
    {
      key: "price",
      header: resolvedPriceLabel,
      headerClassName: "text-right w-[120px]",
      className: "w-[120px]",
      cell: (row) => (
        <Controller
          control={control}
          name={`lines.${row.index}.${priceField}`}
          render={({ field: f, fieldState }) => (
            <div>
              <Input
                type="number"
                min="0"
                step="0.01"
                className={`text-right tabular-nums text-xs ${fieldState.error ? "border-destructive" : ""}`}
                {...f}
              />
              {fieldState.error && (
                <p className="text-[10px] text-destructive mt-0.5">{fieldState.error.message}</p>
              )}
            </div>
          )}
        />
      ),
    },
    {
      key: "taxRate",
      header: "Tax %",
      headerClassName: "text-right w-[90px]",
      className: "w-[90px]",
      cell: (row) => (
        <Controller
          control={control}
          name={`lines.${row.index}.taxRate`}
          render={({ field: f, fieldState }) => (
            <div>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.01"
                className={`text-right tabular-nums text-xs ${fieldState.error ? "border-destructive" : ""}`}
                {...f}
              />
              {fieldState.error && (
                <p className="text-[10px] text-destructive mt-0.5">{fieldState.error.message}</p>
              )}
            </div>
          )}
        />
      ),
    },
    {
      key: "amount",
      header: resolvedAmountLabel,
      headerClassName: "text-right w-[110px]",
      className: "text-right font-mono tabular-nums w-[110px]",
      cell: (row) => (
        <AmountCell
          index={row.index}
          control={control}
          priceField={priceField}
          includesTax={!isPo}
        />
      ),
    },
    {
      key: "remove",
      header: "",
      headerClassName: "w-[50px]",
      className: "w-[50px]",
      cell: (row) => (
        <RemoveLineButton
          index={row.index}
          disabled={!canRemoveLine}
          onRemove={handleRemoveAt}
        />
      ),
    },
  ], [control, variants, isPo, priceField, resolvedPriceLabel, resolvedAmountLabel, canRemoveLine, handleRemoveAt, onVariantChange]);

  const tableFooter = (
    <>
      <div className="flex items-center justify-between">
        <AnimatedIconButton
          type="button"
          icon={PlusIcon}
          iconSize={14}
          iconClassName="mr-1"
          variant="outline"
          size="sm"
          onClick={handleAddLine}
        >
          Add line
        </AnimatedIconButton>
      </div>
      {footer}
    </>
  );

  return (
    <DataTable
      data={fieldRows}
      columns={columns}
      getRowKey={(row) => row.id}
      minWidth={minWidth}
      footer={tableFooter}
    />
  );
}
