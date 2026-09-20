"use client";

import { useCallback } from "react";
import { SearchInput } from "@/components/ui/search-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FILTER_SELECT_TRIGGER, FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { cn } from "@/lib/utils";
import type { CaseCategory, CaseSeverity, CaseStatus } from "@/hooks/api/hr/cases";

const SENTINEL = "__ALL__";

const STATUS_OPTIONS: { value: CaseStatus | typeof SENTINEL; label: string }[] = [
  { value: SENTINEL, label: "All Statuses" },
  { value: "open", label: "Open" },
  { value: "under_investigation", label: "Under Investigation" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
  { value: "dismissed", label: "Dismissed" },
];

const CATEGORY_OPTIONS: { value: CaseCategory | typeof SENTINEL; label: string }[] = [
  { value: SENTINEL, label: "All Categories" },
  { value: "grievance", label: "Grievance" },
  { value: "disciplinary", label: "Disciplinary" },
  { value: "harassment", label: "Harassment" },
  { value: "ethics", label: "Ethics" },
  { value: "performance", label: "Performance" },
  { value: "workplace_conflict", label: "Workplace Conflict" },
  { value: "policy_violation", label: "Policy Violation" },
  { value: "other", label: "Other" },
];

const SEVERITY_OPTIONS: { value: CaseSeverity | typeof SENTINEL; label: string }[] = [
  { value: SENTINEL, label: "All Severities" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

export function isCaseStatus(value: string): value is CaseStatus {
  return STATUS_OPTIONS.some((option) => option.value !== SENTINEL && option.value === value);
}

export function isCaseCategory(value: string): value is CaseCategory {
  return CATEGORY_OPTIONS.some((option) => option.value !== SENTINEL && option.value === value);
}

export function isCaseSeverity(value: string): value is CaseSeverity {
  return SEVERITY_OPTIONS.some((option) => option.value !== SENTINEL && option.value === value);
}

interface CasesFilterBarProps {
  search: string;
  status: CaseStatus | "";
  category: CaseCategory | "";
  severity: CaseSeverity | "";
  onSearchChange: (value: string) => void;
  onStatusChange: (value: CaseStatus | "") => void;
  onCategoryChange: (value: CaseCategory | "") => void;
  onSeverityChange: (value: CaseSeverity | "") => void;
}

/**
 * Owns the filter vocabulary and the narrowing from a Radix `string` back to the
 * typed value, so the page holds state and never re-derives the option lists.
 */
export function CasesFilterBar({
  search,
  status,
  category,
  severity,
  onSearchChange,
  onStatusChange,
  onCategoryChange,
  onSeverityChange,
}: CasesFilterBarProps) {
  const handleStatusChange = useCallback(
    (value: string) => onStatusChange(value === SENTINEL || !isCaseStatus(value) ? "" : value),
    [onStatusChange],
  );

  const handleCategoryChange = useCallback(
    (value: string) => onCategoryChange(value === SENTINEL || !isCaseCategory(value) ? "" : value),
    [onCategoryChange],
  );

  const handleSeverityChange = useCallback(
    (value: string) => onSeverityChange(value === SENTINEL || !isCaseSeverity(value) ? "" : value),
    [onSeverityChange],
  );

  return (
    <div className={FILTER_TOOLBAR_ROW}>
      <SearchInput
        placeholder="Search cases..."
        value={search}
        onValueChange={onSearchChange}
        aria-label="Search cases"
      />
      <Select value={status || SENTINEL} onValueChange={handleStatusChange}>
        <SelectTrigger
          aria-label="Filter by status"
          className={cn("w-[9.5rem]", FILTER_SELECT_TRIGGER)}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="start">
          {STATUS_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={category || SENTINEL} onValueChange={handleCategoryChange}>
        <SelectTrigger
          aria-label="Filter by category"
          className={cn("w-[10rem]", FILTER_SELECT_TRIGGER)}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="start">
          {CATEGORY_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={severity || SENTINEL} onValueChange={handleSeverityChange}>
        <SelectTrigger
          aria-label="Filter by severity"
          className={cn("w-[9rem]", FILTER_SELECT_TRIGGER)}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="start">
          {SEVERITY_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
