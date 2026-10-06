"use client";

import { useCallback, useMemo, useRef } from "react";
import { useSourceOverride } from "@/hooks/common/use-source-override";
import {
  useBuildListFilters,
  BUILD_FILTER_ALL,
} from "@/features/build/shared/use-build-list-filters";
import type {
  FeedbucketSubmissionFilters,
  ListFeedbucketSubmissionsQuery,
} from "@/types/feedbucket";
import {
  FILTER_DEFINITIONS,
  TYPE_OPTIONS,
  STATUS_OPTIONS_VALUES,
} from "./product-feedback-columns";

const PAGE_SIZE = 25;

export { PAGE_SIZE };

interface ProductFeedbackFiltersResult {
  listFilters: ReturnType<typeof useBuildListFilters>;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  page: number;
  selected: Set<string | number>;
  setSelected: React.Dispatch<React.SetStateAction<Set<string | number>>>;
  queryParams: ListFeedbucketSubmissionsQuery;
  bulkFilters: FeedbucketSubmissionFilters;
  typeValue: string;
  statusValue: string;
  linkedValue: string;
  assigneeIdValue: string;
  duplicateValue: string;
  typedFrom: string | undefined;
  typedTo: string | undefined;
  typedAssigneeId: string | undefined;
  handleTypeChange: (value: string) => void;
  handleStatusChange: (value: string) => void;
  handleLinkedChange: (value: string) => void;
  handleAssigneeChange: (value: string) => void;
  handleDuplicateChange: (value: string) => void;
  handleDateRangeChange: (range: { from: string; to: string }) => void;
  handlePageChange: (next: number) => void;
  handleClearSelection: () => void;
}

export function useProductFeedbackFilters(
  managedProductId: number,
): ProductFeedbackFiltersResult {
  const listFilters = useBuildListFilters({ filters: FILTER_DEFINITIONS });
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const typeValue = listFilters.value("type");
  const statusValue = listFilters.value("status");
  const linkedValue = listFilters.value("linked");
  const assigneeIdValue = listFilters.value("assigneeId");
  const duplicateValue = listFilters.value("duplicate");
  const fromValue = listFilters.value("from");
  const toValue = listFilters.value("to");

  const typedType = useMemo(
    () => TYPE_OPTIONS.find((v) => v === typeValue),
    [typeValue],
  );

  const typedStatus = useMemo(
    () => STATUS_OPTIONS_VALUES.find((v) => v === statusValue),
    [statusValue],
  );

  const typedLinked = useMemo(
    () =>
      linkedValue === "linked" || linkedValue === "unlinked"
        ? linkedValue
        : undefined,
    [linkedValue],
  );

  const typedAssigneeId = useMemo(
    () => (assigneeIdValue !== BUILD_FILTER_ALL ? assigneeIdValue : undefined),
    [assigneeIdValue],
  );

  const typedDuplicate = useMemo(
    () =>
      duplicateValue === "true" || duplicateValue === "false"
        ? duplicateValue
        : undefined,
    [duplicateValue],
  );

  const typedFrom = listFilters.isActive("from") ? fromValue : undefined;
  const typedTo = listFilters.isActive("to") ? toValue : undefined;

  const [page, setPage] = useSourceOverride(listFilters.resetKey, 1);
  const [selected, setSelected] = useSourceOverride(listFilters.resetKey, new Set<string | number>());

  const queryParams = useMemo(
    (): ListFeedbucketSubmissionsQuery => ({
      managedProductId,
      page,
      limit: PAGE_SIZE,
      ...(listFilters.debouncedSearch.trim()
        ? { search: listFilters.debouncedSearch.trim() }
        : {}),
      ...(typedType ? { type: typedType } : {}),
      ...(typedStatus ? { status: typedStatus } : {}),
      ...(typedLinked ? { linked: typedLinked } : {}),
      ...(typedAssigneeId ? { assigneeId: typedAssigneeId } : {}),
      ...(typedDuplicate ? { duplicate: typedDuplicate } : {}),
      ...(typedFrom ? { from: typedFrom } : {}),
      ...(typedTo ? { to: typedTo } : {}),
    }),
    [
      managedProductId,
      page,
      listFilters.debouncedSearch,
      typedType,
      typedStatus,
      typedLinked,
      typedAssigneeId,
      typedDuplicate,
      typedFrom,
      typedTo,
    ],
  );

  const bulkFilters = useMemo<FeedbucketSubmissionFilters>(
    () => ({
      managedProductId,
      ...(typedType ? { type: typedType } : {}),
      ...(typedStatus ? { status: typedStatus } : {}),
      ...(typedLinked ? { linked: typedLinked } : {}),
      ...(typedAssigneeId ? { assigneeId: typedAssigneeId } : {}),
      ...(typedDuplicate ? { duplicate: typedDuplicate } : {}),
      ...(typedFrom ? { from: typedFrom } : {}),
      ...(typedTo ? { to: typedTo } : {}),
      ...(listFilters.debouncedSearch.trim()
        ? { search: listFilters.debouncedSearch.trim() }
        : {}),
    }),
    [
      managedProductId,
      typedType,
      typedStatus,
      typedLinked,
      typedAssigneeId,
      typedDuplicate,
      typedFrom,
      typedTo,
      listFilters.debouncedSearch,
    ],
  );

  const handleTypeChange = useCallback(
    (value: string) => listFilters.setValue("type", value),
    [listFilters],
  );

  const handleStatusChange = useCallback(
    (value: string) => listFilters.setValue("status", value),
    [listFilters],
  );

  const handleLinkedChange = useCallback(
    (value: string) => listFilters.setValue("linked", value),
    [listFilters],
  );

  const handleAssigneeChange = useCallback(
    (value: string) =>
      listFilters.setValue("assigneeId", value || BUILD_FILTER_ALL),
    [listFilters],
  );

  const handleDuplicateChange = useCallback(
    (value: string) => listFilters.setValue("duplicate", value),
    [listFilters],
  );

  const handleDateRangeChange = useCallback(
    (range: { from: string; to: string }) => {
      listFilters.setValue("from", range.from);
      listFilters.setValue("to", range.to);
    },
    [listFilters],
  );

  const handlePageChange = useCallback((next: number) => {
    setPage(next);
  }, [setPage]);

  const handleClearSelection = useCallback(() => setSelected(new Set()), [setSelected]);

  return {
    listFilters,
    searchInputRef,
    page,
    selected,
    setSelected,
    queryParams,
    bulkFilters,
    typeValue,
    statusValue,
    linkedValue,
    assigneeIdValue,
    duplicateValue,
    typedFrom,
    typedTo,
    typedAssigneeId,
    handleTypeChange,
    handleStatusChange,
    handleLinkedChange,
    handleAssigneeChange,
    handleDuplicateChange,
    handleDateRangeChange,
    handlePageChange,
    handleClearSelection,
  };
}
