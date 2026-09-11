"use client";

import { memo } from "react";
import { Trash2Icon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProductVariantCombobox } from "@/components/inventory/product-variant-combobox";
import { useLots, useSerials } from "@/hooks/api/inventory/traceability";
import type { EditableLine } from "./package-line-types";

interface EditableLineRowProps {
  index: number;
  line: EditableLine;
  onChangeField: (index: number, field: keyof EditableLine, value: string) => void;
  onRemove: (index: number) => void;
}

export const EditableLineRow = memo(function EditableLineRow({
  index,
  line,
  onChangeField,
  onRemove,
}: EditableLineRowProps) {
  const numericVariantId = Number(line.variantId);
  const variantEnabled = Number.isInteger(numericVariantId) && numericVariantId > 0;
  const { data: lotsData } = useLots(
    variantEnabled ? { variantId: numericVariantId, status: "ACTIVE", limit: 100 } : undefined,
  );
  const { data: serialsData } = useSerials(
    variantEnabled ? { variantId: numericVariantId, status: "IN_STOCK", limit: 100 } : undefined,
  );
  const lots = lotsData?.items ?? [];
  const serials = serialsData?.items ?? [];

  function handleVariantChange(value: string): void {
    onChangeField(index, "variantId", value);
    onChangeField(index, "lotId", "");
    onChangeField(index, "serialId", "");
  }
  function handleQtyChange(e: React.ChangeEvent<HTMLInputElement>): void {
    onChangeField(index, "qty", e.target.value);
  }
  function handleLotChange(value: string): void {
    onChangeField(index, "lotId", value === "none" ? "" : value);
  }
  function handleSerialChange(value: string): void {
    onChangeField(index, "serialId", value === "none" ? "" : value);
  }
  function handleRemove(): void {
    onRemove(index);
  }

  return (
    <div className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-1.5 items-end">
      <div className="space-y-0.5">
        <Label className="text-micro font-semibold text-foreground/80">Variant</Label>
        <ProductVariantCombobox
          value={line.variantId}
          onChange={handleVariantChange}
          className="text-xs"
          ariaLabel={`Variant, line ${String(index + 1)}`}
        />
      </div>
      <div className="space-y-0.5">
        <Label className="text-micro font-semibold text-foreground/80">Qty</Label>
        <Input
          type="number"
          min="1"
          value={line.qty}
          onChange={handleQtyChange}
          className="text-xs"
        />
      </div>
      <div className="space-y-0.5">
        <Label className="text-micro font-semibold text-foreground/80">Lot</Label>
        <Select
          value={line.lotId || "none"}
          onValueChange={handleLotChange}
          disabled={!variantEnabled || lots.length === 0}
        >
          <SelectTrigger className="text-xs">
            <SelectValue placeholder="—" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">—</SelectItem>
            {lots.map((lot) => (
              <SelectItem key={lot.id} value={String(lot.id)}>
                {lot.lotNumber}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-0.5">
        <Label className="text-micro font-semibold text-foreground/80">Serial</Label>
        <Select
          value={line.serialId || "none"}
          onValueChange={handleSerialChange}
          disabled={!variantEnabled || serials.length === 0}
        >
          <SelectTrigger className="text-xs">
            <SelectValue placeholder="—" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">—</SelectItem>
            {serials.map((serial) => (
              <SelectItem key={serial.id} value={String(serial.id)}>
                {serial.serialNumber}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <AnimatedIconButton
        type="button"
        icon={Trash2Icon}
        iconSize={14}
        iconClassName="text-destructive"
        variant="ghost"
        size="icon"
        className="w-7 shrink-0"
        aria-label="Remove item from package"
        onClick={handleRemove}
      />
    </div>
  );
});
