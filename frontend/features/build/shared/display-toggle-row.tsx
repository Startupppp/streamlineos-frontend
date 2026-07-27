"use client";

import type { MouseEvent as ReactMouseEvent } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface DisplayToggleRowProps {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export function DisplayToggleRow({
  id,
  label,
  checked,
  onCheckedChange,
}: DisplayToggleRowProps) {
  function handleLabelClick(event: ReactMouseEvent<HTMLLabelElement>) {
    event.preventDefault();
    onCheckedChange(!checked);
  }

  return (
    <div className="flex h-9 items-center justify-between gap-3">
      <Label
        htmlFor={id}
        onClick={handleLabelClick}
        className="cursor-pointer text-[13px] font-normal text-foreground"
      >
        {label}
      </Label>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
