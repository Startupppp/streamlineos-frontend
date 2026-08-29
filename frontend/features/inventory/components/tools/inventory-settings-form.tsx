"use client";

import { useFormContext } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { InventorySettings } from "@/hooks/api/inventory/admin";

function SwitchField({
  name,
  label,
}: {
  name: keyof InventorySettings;
  label: string;
}) {
  const { watch, setValue } = useFormContext<InventorySettings>();
  const value = watch(name) as boolean;
  function handleChange(checked: boolean) {
    setValue(name, checked, { shouldDirty: true });
  }
  return (
    <div className="flex items-center justify-between py-2">
      <Label className="text-sm font-normal">{label}</Label>
      <Switch checked={value} onCheckedChange={handleChange} />
    </div>
  );
}

function SelectField({
  name,
  label,
  options,
}: {
  name: keyof InventorySettings;
  label: string;
  options: { value: string; label: string }[];
}) {
  const { watch, setValue } = useFormContext<InventorySettings>();
  const value = watch(name) as string;
  function handleChange(v: string) {
    setValue(name, v as never, { shouldDirty: true });
  }
  return (
    <div className="flex items-center justify-between py-2">
      <Label className="text-sm font-normal">{label}</Label>
      <Select value={value} onValueChange={handleChange}>
        <SelectTrigger className="w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map(function renderOption(opt) {
            return (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}

function NumberField({
  name,
  label,
  suffix,
}: {
  name: keyof InventorySettings;
  label: string;
  suffix?: string;
}) {
  const { watch, setValue } = useFormContext<InventorySettings>();
  const value = watch(name) as number;
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setValue(name, parseFloat(e.target.value) || 0, { shouldDirty: true });
  }
  return (
    <div className="flex items-center justify-between py-2">
      <Label className="text-sm font-normal">{label}</Label>
      <div className="flex items-center gap-1.5">
        <Input
          type="number"
          value={value}
          onChange={handleChange}
          className="w-28 text-right"
        />
        {suffix && <span className="text-sm text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );
}

const RESERVATION_STRATEGY_OPTIONS = [
  { value: "MANUAL", label: "Manual" },
  { value: "AUTO_ON_CONFIRM", label: "Auto on Confirm" },
  { value: "FEFO", label: "FEFO" },
  { value: "FIFO", label: "FIFO" },
];

const EXPIRY_POLICY_OPTIONS = [
  { value: "BLOCK", label: "Block" },
  { value: "WARN", label: "Warn" },
  { value: "ALLOW", label: "Allow" },
];

const COSTING_METHOD_OPTIONS = [
  { value: "FIFO", label: "FIFO" },
  { value: "LIFO", label: "LIFO" },
  { value: "WEIGHTED_AVG", label: "Weighted Average" },
  { value: "STANDARD", label: "Standard Cost" },
];

export function InventorySettingsForm() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Stock Policy</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          <SwitchField name="allowNegativeStock" label="Allow Negative Stock" />
          <SwitchField name="allowBackorders" label="Allow Backorders" />
          <SelectField
            name="reservationStrategy"
            label="Reservation Strategy"
            options={RESERVATION_STRATEGY_OPTIONS}
          />
          <SwitchField name="autoReserveOnConfirm" label="Auto-reserve on Confirm" />
          <SelectField
            name="expiryReservationPolicy"
            label="Expiry Reservation Policy"
            options={EXPIRY_POLICY_OPTIONS}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Procurement</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          <SwitchField name="requirePoApproval" label="Require PO Approval" />
          <NumberField
            name="overReceiptTolerancePct"
            label="Over-receipt Tolerance"
            suffix="%"
          />
          <NumberField
            name="adjustmentApprovalThreshold"
            label="Adjustment Approval Threshold"
            suffix="currency"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Fulfillment</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          <SwitchField name="allowPartialShipment" label="Allow Partial Shipment" />
          <SwitchField name="packageRequiredForShipping" label="Package Required for Shipping" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Valuation</CardTitle>
        </CardHeader>
        <CardContent>
          <SelectField
            name="defaultCostingMethod"
            label="Default Costing Method"
            options={COSTING_METHOD_OPTIONS}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Packs</CardTitle>
          <CardDescription>
            A pack is a bundle of domain rules only some businesses need. Turning one off
            hides its navigation, its fields and its validation — it never deletes data
            already captured, so switching a pack back on finds its records intact.
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          <SwitchField name="packWarehouse" label="Warehouse — bins, putaway, waves, packing, shipping" />
          <SwitchField name="packGst" label="GST — HSN codes and tax treatment on products and document lines" />
          <SwitchField name="packPharmacy" label="Pharmacy — MRP, GS1 on receive, LASA and high-alert handling" />
          <SwitchField name="packKirana" label="Kirana — loose versus packed selling units and scale quantities" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Quality</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          <SwitchField name="inspectionOnReceipt" label="Inspection on Receipt" />
          <SwitchField name="inspectionOnReturn" label="Inspection on Return" />
        </CardContent>
      </Card>
    </div>
  );
}
