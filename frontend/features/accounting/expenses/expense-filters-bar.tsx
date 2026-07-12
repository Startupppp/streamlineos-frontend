"use client";

import { useCallback, type ChangeEvent } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ExpenseStatus } from "@/features/accounting/shared";

export type StatusFilter = "ALL" | ExpenseStatus;

const STATUS_OPTIONS: ReadonlyArray<{ value: StatusFilter; label: string }> = [
  { value: "ALL", label: "All statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "APPROVED", label: "Approved" },
  { value: "REIMBURSEMENT_PENDING", label: "Reimb. Pending" },
  { value: "REIMBURSED", label: "Reimbursed" },
  { value: "REJECTED", label: "Rejected" },
];

function isStatusFilter(value: string): value is StatusFilter {
  return STATUS_OPTIONS.some((opt) => opt.value === value);
}

interface ExpenseFiltersBarProps {
  search: string;
  status: StatusFilter;
  startDate: string;
  endDate: string;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: StatusFilter) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
}

export function ExpenseFiltersBar({
  search,
  status,
  startDate,
  endDate,
  onSearchChange,
  onStatusChange,
  onStartDateChange,
  onEndDateChange,
}: ExpenseFiltersBarProps) {
  const handleSearchChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      onSearchChange(e.target.value);
    },
    [onSearchChange],
  );

  const handleStatusChange = useCallback(
    (value: string) => {
      if (isStatusFilter(value)) onStatusChange(value);
    },
    [onStatusChange],
  );

  const handleStartDateChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      onStartDateChange(e.target.value);
    },
    [onStartDateChange],
  );

  const handleEndDateChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      onEndDateChange(e.target.value);
    },
    [onEndDateChange],
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative flex-1 max-w-[220px]">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          value={search}
          onChange={handleSearchChange}
          placeholder="Search merchant or description"
          className="h-8 w-full pl-8 text-xs"
        />
      </div>
      <Select value={status} onValueChange={handleStatusChange}>
        <SelectTrigger className="h-8 w-[170px] text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        type="date"
        value={startDate}
        onChange={handleStartDateChange}
        className="h-8 w-[140px] text-xs"
      />
      <Input
        type="date"
        value={endDate}
        onChange={handleEndDateChange}
        className="h-8 w-[140px] text-xs"
      />
    </div>
  );
}
