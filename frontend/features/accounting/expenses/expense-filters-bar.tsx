"use client";

import { useCallback, type ChangeEvent } from "react";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
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
    (value: string) => {
      onSearchChange(value);
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
      <div className="min-w-0 flex-1 max-w-[220px] w-full">
          <SearchInput value={search} onValueChange={handleSearchChange} placeholder="Search merchant or description" />
        </div>
      <Select value={status} onValueChange={handleStatusChange}>
        <SelectTrigger className="w-[170px] text-xs">
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
        className="w-[140px] text-xs"
      />
      <Input
        type="date"
        value={endDate}
        onChange={handleEndDateChange}
        className="w-[140px] text-xs"
      />
    </div>
  );
}
