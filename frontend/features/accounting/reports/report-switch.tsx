"use client";

import { useId } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface ReportSwitchProps {
  label: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
}

export function ReportSwitch({ label, checked, onCheckedChange }: ReportSwitchProps) {
  const id = useId();
  return (
    <div className="flex shrink-0 items-center gap-2">
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
      <Label htmlFor={id} className="whitespace-nowrap text-label font-medium">
        {label}
      </Label>
    </div>
  );
}
