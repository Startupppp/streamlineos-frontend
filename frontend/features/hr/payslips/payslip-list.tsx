"use client";

import { format, parseISO } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyDocumentsIllustration } from "@/components/illustrations";

interface PayslipMonth {
  value: string;
  label: string;
}

interface PayslipListProps {
  payslips: Array<{ month: string }>;
  selectedMonth: string;
  onMonthChange: (month: string) => void;
}

export function PayslipList({ payslips, selectedMonth, onMonthChange }: PayslipListProps) {
  const availableMonths: PayslipMonth[] = payslips.map((p) => ({
    value: p.month,
    label: format(parseISO(p.month + "-01"), "MMMM yyyy"),
  }));

  if (payslips.length === 0) {
    return (
      <EmptyState
        illustration={<EmptyDocumentsIllustration className="h-32 w-32" />}
        title="No payslips available"
        description="Your payslips will appear here once they have been generated."
      />
    );
  }

  return (
    <Select value={selectedMonth} onValueChange={onMonthChange}>
      <SelectTrigger className="w-[200px]" aria-label="Select payslip month">
        <SelectValue placeholder="Select month" />
      </SelectTrigger>
      <SelectContent className="z-50">
        {availableMonths.map((month) => (
          <SelectItem key={month.value} value={month.value}>
            {month.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
