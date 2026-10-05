"use client";

import { useEffect, useState, type RefObject } from "react";
import { DatePicker } from "@/components/ui/date-picker";
import { UserCombobox } from "@/components/ui/user-combobox";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import {
  ALL_STATUSES,
  ALL_TYPES,
  STATUS_LABELS,
  TYPE_LABELS,
} from "./feedbucket-constants";
import type {
  FeedbucketSubmissionStatus,
  FeedbucketSubmissionType,
} from "@/types/feedbucket";

export interface SubmissionInboxFilterValues {
  status: FeedbucketSubmissionStatus | null;
  type: FeedbucketSubmissionType | null;
  linked: "linked" | "unlinked" | null;
  duplicate: "true" | "false" | null;
  assigneeId: string | null;
  search: string | null;
  from: string | null;
  to: string | null;
}

interface SubmissionInboxFiltersProps {
  values: SubmissionInboxFilterValues;
  onChange: (key: keyof SubmissionInboxFilterValues, value: string | null) => void;
  searchInputRef?: RefObject<HTMLInputElement | null>;
}

function dateParamToInput(value: string | null): string {
  return value ? value.slice(0, 10) : "";
}

function inputToDateParam(value: string): string | null {
  return value ? `${value}T00:00:00Z` : null;
}

export function SubmissionInboxFilters({ values, onChange, searchInputRef }: SubmissionInboxFiltersProps) {
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

  function handleFromChange(value: string) {
    onChange("from", inputToDateParam(value));
  }

  function handleToChange(value: string) {
    onChange("to", inputToDateParam(value));
  }

  function handleClearAll() {
    setSearchDraft("");
    for (const key of ["status", "type", "linked", "duplicate", "assigneeId", "search", "from", "to"] as const) {
      onChange(key, null);
    }
  }

  return (
    <BuildListToolbar
      className="border-b border-border px-3 py-2"
      search={{
        value: searchDraft,
        onValueChange: setSearchDraft,
        placeholder: "Search messages…",
        label: "Search submissions",
        inputRef: searchInputRef,
      }}
      filters={[
        {
          id: "status",
          label: "Status",
          active: values.status !== null,
          control: (
            <BuildFilterSelect
              label="Filter by status"
              value={values.status ?? "all"}
              onValueChange={handleStatusChange}
              options={[
                { value: "all", label: "All statuses" },
                ...ALL_STATUSES.map((status) => ({ value: status, label: STATUS_LABELS[status] })),
              ]}
            />
          ),
        },
        {
          id: "type",
          label: "Type",
          active: values.type !== null,
          control: (
            <BuildFilterSelect
              label="Filter by type"
              value={values.type ?? "all"}
              onValueChange={handleTypeChange}
              options={[
                { value: "all", label: "All types" },
                ...ALL_TYPES.map((type) => ({ value: type, label: TYPE_LABELS[type] })),
              ]}
            />
          ),
        },
        {
          id: "linked",
          label: "Ticket link",
          active: values.linked !== null,
          control: (
            <BuildFilterSelect
              label="Filter by ticket link"
              value={values.linked ?? "all"}
              onValueChange={handleLinkedChange}
              options={[
                { value: "all", label: "All submissions" },
                { value: "linked", label: "Linked to ticket" },
                { value: "unlinked", label: "Not linked" },
              ]}
            />
          ),
        },
        {
          id: "assignee",
          label: "Owner",
          active: values.assigneeId !== null,
          control: (
            <UserCombobox
              value={values.assigneeId ?? ""}
              onChange={handleAssigneeChange}
              placeholder="Any owner"
              allowUnassigned
              className="w-full min-w-44 md:w-44"
            />
          ),
        },
        {
          id: "from",
          label: "From date",
          active: values.from !== null,
          control: (
            <DatePicker
              ariaLabel="From date"
              clearable
              value={dateParamToInput(values.from)}
              onChange={handleFromChange}
              placeholder="From date"
              className="w-full min-w-40 md:w-40"
            />
          ),
        },
        {
          id: "to",
          label: "To date",
          active: values.to !== null,
          control: (
            <DatePicker
              ariaLabel="To date"
              clearable
              value={dateParamToInput(values.to)}
              onChange={handleToChange}
              placeholder="To date"
              className="w-full min-w-40 md:w-40"
            />
          ),
        },
      ]}
      onClearAll={handleClearAll}
    />
  );
}
