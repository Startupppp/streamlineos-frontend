"use client";

import { Checkbox } from "@/components/ui/checkbox";

interface FieldCheckItemProps {
  field: { value: string; label: string };
  isChecked: boolean;
  onToggle: (value: string) => void;
}

export function FieldCheckItem({ field: f, isChecked, onToggle }: FieldCheckItemProps) {
  function handleCheckedChange() {
    onToggle(f.value);
  }
  return (
    <div className="flex items-center gap-2">
      <Checkbox
        id={f.value}
        checked={isChecked}
        onCheckedChange={handleCheckedChange}
      />
      <label htmlFor={f.value} className="text-xs cursor-pointer">
        {f.label}
      </label>
    </div>
  );
}
