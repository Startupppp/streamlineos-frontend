"use client";

import { useCallback } from "react";
import { SearchInput } from "@/components/ui/search-input";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FILTER_TOOLBAR_ROW, FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
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
  const handleStatusChange = useCallback(
    (value: string) => {
      if (isStatusFilter(value)) onStatusChange(value);
    },
    [onStatusChange],
  );

  return (
    <div className={FILTER_TOOLBAR_ROW}>
      <SearchInput value={search} onValueChange={onSearchChange} placeholder="Search merchant or description" />
      <Select value={status} onValueChange={handleStatusChange}>
        <SelectTrigger className={`w-[170px] ${FILTER_SELECT_TRIGGER}`}>
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
      <DatePicker
        value={startDate}
        onChange={onStartDateChange}
        placeholder="Start date"
        className="w-[140px]"
      />
      <DatePicker
        value={endDate}
        onChange={onEndDateChange}
        placeholder="End date"
        className="w-[140px]"
      />
    </div>
  );
}
