"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type MonthPickerProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
  yearRange?: [number, number];
  minMonth?: string;
};

const MONTHS = [
  "January", "February", "March", "April",
  "May", "June", "July", "August",
  "September", "October", "November", "December",
];

function generateOptions(yearRange: [number, number]): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  const [startOffset, endOffset] = yearRange;
  const startYear = now.getFullYear() + startOffset;
  const endYear = now.getFullYear() + endOffset;

  for (let y = startYear; y <= endYear; y++) {
    for (let m = 0; m < 12; m++) {
      const month = String(m + 1).padStart(2, "0");
      options.push({
        value: `${y}-${month}`,
        label: `${MONTHS[m]} ${y}`,
      });
    }
  }
  return options;
}

export function monthFromToday(offsetMonths: number): string {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() + offsetMonths, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function MonthPicker({
  id,
  value,
  onChange,
  className,
  disabled,
  yearRange = [0, 1],
  minMonth,
}: MonthPickerProps) {
  const options = generateOptions(yearRange).filter(
    (opt) => !minMonth || opt.value >= minMonth || opt.value === value,
  );

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger id={id} className={cn("text-sm", className)}>
        <SelectValue placeholder="Select month" />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
