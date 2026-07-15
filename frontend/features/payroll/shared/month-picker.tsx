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
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
  yearRange?: [number, number];
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

export function MonthPicker({
  value,
  onChange,
  className,
  disabled,
  yearRange = [0, 1],
}: MonthPickerProps) {
  const options = generateOptions(yearRange);

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className={cn("text-sm", className)}>
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
