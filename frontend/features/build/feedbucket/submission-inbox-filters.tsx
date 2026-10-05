"use client";

import { useEffect, useReducer, type RefObject } from "react";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { DatePicker } from "@/components/ui/date-picker";
import { UserCombobox } from "@/components/ui/user-combobox";
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
  onChange: (
    key: keyof SubmissionInboxFilterValues,
    value: string | null,
  ) => void;
  onClearAll: () => void;
  searchInputRef?: RefObject<HTMLInputElement | null>;
}

type SearchState = {
  draft: string;
  appliedSearch: string;
  writtenSearch: string | null;
};
type SearchAction =
  | { type: "input" | "publish" | "synchronize"; value: string }
  | { type: "clear" };

function searchReducer(state: SearchState, action: SearchAction): SearchState {
  switch (action.type) {
    case "input":
      return { ...state, draft: action.value };
    case "publish":
      return { ...state, writtenSearch: action.value };
    case "clear":
      return {
        ...state,
        draft: "",
        writtenSearch: state.appliedSearch ? "" : null,
      };
    case "synchronize":
      if (state.appliedSearch === action.value) return state;
      return {
        draft:
          action.value === state.writtenSearch ? state.draft : action.value,
        appliedSearch: action.value,
        writtenSearch: null,
      };
  }
}

function dateParamToInput(value: string | null): string {
  return value ? value.slice(0, 10) : "";
}

function inputToDateParam(value: string): string | null {
  return value ? `${value}T00:00:00Z` : null;
}

export function SubmissionInboxFilters({
  values,
  onChange,
  onClearAll,
  searchInputRef,
}: SubmissionInboxFiltersProps) {
  const incomingSearch = values.search ?? "";
  const [searchState, dispatchSearch] = useReducer(searchReducer, {
    draft: incomingSearch,
    appliedSearch: incomingSearch,
    writtenSearch: null,
  });
  const searchDraft =
    searchState.appliedSearch !== incomingSearch &&
    incomingSearch !== searchState.writtenSearch
      ? incomingSearch
      : searchState.draft;
  const debouncedSearch = useDebouncedValue(searchDraft, 300);

  useEffect(() => {
    dispatchSearch({ type: "synchronize", value: incomingSearch });
  }, [incomingSearch]);

  useEffect(() => {
    if (searchState.appliedSearch !== incomingSearch) return;
    const next = debouncedSearch.trim();
    if (next !== searchState.draft.trim() || next === incomingSearch || searchState.writtenSearch !== null) return;
    dispatchSearch({ type: "publish", value: next });
    onChange("search", next === "" ? null : next);
  }, [searchState, debouncedSearch, incomingSearch, onChange]);

  function handleSearchChange(value: string) {
    dispatchSearch({ type: "input", value });
  }

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
    dispatchSearch({ type: "clear" });
    onClearAll();
  }

  return (
    <BuildListToolbar
      className="border-b border-border px-3 py-2"
      search={{
        value: searchDraft,
        inputRef: searchInputRef,
        label: "Search submissions",
        placeholder: "Search messages…",
        onValueChange: handleSearchChange,
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
                ...ALL_STATUSES.map((status) => ({
                  value: status,
                  label: STATUS_LABELS[status],
                })),
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
                ...ALL_TYPES.map((type) => ({
                  value: type,
                  label: TYPE_LABELS[type],
                })),
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
