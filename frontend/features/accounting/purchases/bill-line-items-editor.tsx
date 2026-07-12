"use client";

import { Controller, useFormContext } from "react-hook-form";
import type { FieldArrayWithId } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GST_RATES, num, round2 } from "./bill-form-schemas";
import type { NewBillFormValues } from "./bill-form-schemas";

type ItemField = FieldArrayWithId<NewBillFormValues, "items"> & { _index: number };

interface BillLineItemsEditorProps {
  fields: FieldArrayWithId<NewBillFormValues, "items">[];
  watchedItems: NewBillFormValues["items"];
  onAddItem: () => void;
  onRemoveItemAt: (index: number) => () => void;
}

export function BillLineItemsEditor({
  fields,
  watchedItems,
  onAddItem,
  onRemoveItemAt,
}: BillLineItemsEditorProps) {
  const form = useFormContext<NewBillFormValues>();

  const rows: ItemField[] = fields.map((field, index) => ({ ...field, _index: index }));

  const columns: DataTableColumn<ItemField>[] = [
    {
      key: "description",
      header: "Description",
      cell: (row) => (
        <Controller
          control={form.control}
          name={`items.${row._index}.description`}
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
      ),
    },
    {
      key: "hsnSacCode",
      header: "HSN/SAC",
      headerClassName: "w-[100px]",
      className: "w-[100px]",
      cell: (row) => (
        <Controller
          control={form.control}
          name={`items.${row._index}.hsnSacCode`}
          render={({ field: f }) => <Input {...f} />}
        />
      ),
    },
    {
      key: "quantity",
      header: "Qty",
      headerClassName: "text-right w-[100px]",
      className: "w-[100px]",
      cell: (row) => (
        <Controller
          control={form.control}
          name={`items.${row._index}.quantity`}
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
      ),
    },
    {
      key: "rate",
      header: "Rate",
      headerClassName: "text-right w-[120px]",
      className: "w-[120px]",
      cell: (row) => (
        <Controller
          control={form.control}
          name={`items.${row._index}.rate`}
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
      ),
    },
    {
      key: "gstRate",
      header: "GST %",
      headerClassName: "w-[100px]",
      className: "w-[100px]",
      cell: (row) => (
        <Controller
          control={form.control}
          name={`items.${row._index}.gstRate`}
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
      ),
    },
    {
      key: "amount",
      header: "Amount",
      headerClassName: "text-right w-[120px]",
      className: "w-[120px] text-right tabular-nums",
      cell: (row) => {
        const qty = num(watchedItems[row._index]?.quantity ?? "0");
        const rate = num(watchedItems[row._index]?.rate ?? "0");
        return round2(qty * rate).toFixed(2);
      },
    },
    {
      key: "remove",
      header: "",
      headerClassName: "w-[60px]",
      className: "w-[60px]",
      cell: (row) => (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemoveItemAt(row._index)}
          disabled={fields.length <= 1}
          aria-label="Remove line item"
        >
          <Trash2 className="size-4" />
        </Button>
      ),
    },
  ];

  const footer = (
    <Button type="button" variant="outline" size="sm" onClick={onAddItem}>
      <Plus className="size-4 mr-1" />
      Add line
    </Button>
  );

  return (
    <DataTable
      data={rows}
      columns={columns}
      getRowKey={(row) => row.id}
      footer={footer}
      minWidth="760px"
      className="overflow-hidden"
    />
  );
}
