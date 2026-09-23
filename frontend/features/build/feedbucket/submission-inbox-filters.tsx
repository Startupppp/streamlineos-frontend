"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { UserCombobox } from "@/components/ui/user-combobox";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import {
  ALL_STATUSES,
  ALL_TYPES,
  STATUS_LABELS,
  TYPE_LABELS,
} from "./submission-inbox-columns";
import type {
  FeedbucketSubmissionStatus,
  FeedbucketSubmissionType,
} from "@/types/feedbucket";

export interface SubmissionInboxFilterValues {
  status: FeedbucketSubmissionStatus | null;
  type: FeedbucketSubmissionType | null;
  linked: "linked" | "unlinked" | null;
  assigneeId: string | null;
  search: string | null;
  from: string | null;
  to: string | null;
}

interface SubmissionInboxFiltersProps {
  values: SubmissionInboxFilterValues;
  onChange: (key: keyof SubmissionInboxFilterValues, value: string | null) => void;
}

function dateParamToInput(value: string | null): string {
  return value ? value.slice(0, 10) : "";
}

function inputToDateParam(value: string): string | null {
  return value ? `${value}T00:00:00Z` : null;
}

export function SubmissionInboxFilters({ values, onChange }: SubmissionInboxFiltersProps) {
  const [searchDraft, setSearchDraft] = useState(values.search ?? "");
  const debouncedSearch = useDebouncedValue(searchDraft, 300);

  useEffect(() => {
    const next = debouncedSearch.trim();
    if (next === (values.search ?? "")) return;
    onChange("search", next === "" ? null : next);
  }, [debouncedSearch, values.search, onChange]);

  function handleStatusChange(value: string) {
    onChange("status", value === "all" ? null : value);
  }

  function handleTypeChange(value: string) {
    onChange("type", value === "all" ? null : value);
  }

  function handleLinkedChange(value: string) {
    onChange("linked", value === "all" ? null : value);
  }

  function handleAssigneeChange(value: string) {
    onChange("assigneeId", value === "" ? null : value);
  }

  function handleFromChange(event: ChangeEvent<HTMLInputElement>) {
    onChange("from", inputToDateParam(event.target.value));
  }

  function handleToChange(event: ChangeEvent<HTMLInputElement>) {
    onChange("to", inputToDateParam(event.target.value));
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b border-border flex-wrap">
      <SearchInput
        value={searchDraft}
        onValueChange={setSearchDraft}
        placeholder="Search messages…"
        aria-label="Search submissions"
        className="w-[200px]"
      />

      <Select value={values.status ?? "all"} onValueChange={handleStatusChange}>
        <SelectTrigger className="h-9 w-[130px] text-sm" aria-label="Filter by status">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {ALL_STATUSES.map((status) => (
            <SelectItem key={status} value={status}>
              {STATUS_LABELS[status]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={values.type ?? "all"} onValueChange={handleTypeChange}>
        <SelectTrigger className="h-9 w-[120px] text-sm" aria-label="Filter by type">
          <SelectValue placeholder="All types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All types</SelectItem>
          {ALL_TYPES.map((type) => (
            <SelectItem key={type} value={type}>
              {TYPE_LABELS[type]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={values.linked ?? "all"} onValueChange={handleLinkedChange}>
        <SelectTrigger className="h-9 w-[130px] text-sm" aria-label="Filter by ticket link">
          <SelectValue placeholder="All submissions" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All submissions</SelectItem>
          <SelectItem value="linked">Linked to ticket</SelectItem>
          <SelectItem value="unlinked">Not linked</SelectItem>
        </SelectContent>
      </Select>

      <UserCombobox
        value={values.assigneeId ?? ""}
        onChange={handleAssigneeChange}
        placeholder="Any owner"
        allowUnassigned
        className="w-[170px]"
      />

      <Input
        type="date"
        aria-label="From date"
        value={dateParamToInput(values.from)}
        onChange={handleFromChange}
        className="h-9 w-[140px] text-sm"
      />

      <Input
        type="date"
        aria-label="To date"
        value={dateParamToInput(values.to)}
        onChange={handleToChange}
        className="h-9 w-[140px] text-sm"
      />
    </div>
  );
}
