"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatInvoiceAmount } from "./invoice-detail-utils";

/**
 * One editable row of the invoice edit dialog. Only description, quantity and
 * rate are editable here; the line's GST rate and HSN/SAC code ride along
 * untouched in the parent's state so the PATCH can hand them back.
 */
interface EditLineItemRowProps {
  item: { description: string; quantity: number; rate: number; amount: number };
  idx: number;
  isOnly: boolean;
  onDescriptionChange: (idx: number, value: string) => void;
  onQuantityChange: (idx: number, value: string) => void;
  onRateChange: (idx: number, value: string) => void;
  onRemove: (idx: number) => void;
}

export function EditLineItemRow({
  item,
  idx,
  isOnly,
  onDescriptionChange,
  onQuantityChange,
  onRateChange,
  onRemove,
}: EditLineItemRowProps) {
  function handleDescChange(e: React.ChangeEvent<HTMLInputElement>) {
    onDescriptionChange(idx, e.target.value);
  }
  function handleQtyChange(e: React.ChangeEvent<HTMLInputElement>) {
    onQuantityChange(idx, e.target.value);
  }
  function handleRateFieldChange(e: React.ChangeEvent<HTMLInputElement>) {
    onRateChange(idx, e.target.value);
  }
  function handleRemoveClick() {
    onRemove(idx);
  }

  return (
    <div className="grid grid-cols-12 gap-2 items-center">
      <Input
        className="col-span-5"
        placeholder="Description"
        value={item.description}
        onChange={handleDescChange}
      />
      <Input
        className="col-span-2 text-right"
        type="number"
        min={1}
        value={item.quantity || ""}
        onChange={handleQtyChange}
        aria-label={`Quantity for item ${idx + 1}`}
      />
      <Input
        className="col-span-2 text-right"
        type="number"
        min={0}
        value={item.rate || ""}
        onChange={handleRateFieldChange}
        aria-label={`Rate for item ${idx + 1}`}
      />
      <div className="col-span-2 text-sm font-medium text-right pr-1">
        {formatInvoiceAmount(item.amount)}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="col-span-1 h-8 w-8 text-muted-foreground hover:text-destructive"
        onClick={handleRemoveClick}
        disabled={isOnly}
        aria-label={`Remove item ${idx + 1}`}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
