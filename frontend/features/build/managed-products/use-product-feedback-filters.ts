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
import type {
  FeedbucketSourceChannel,
  FeedbucketSentiment,
  FeedbucketConsentStatus,
} from "@/types/feedbucket";
import {
  FILTER_DEFINITIONS,
  TYPE_OPTIONS,
  STATUS_OPTIONS_VALUES,
  SOURCE_CHANNEL_FILTER_OPTIONS,
  SENTIMENT_FILTER_OPTIONS,
  CONSENT_FILTER_OPTIONS,
} from "./product-feedback-columns";

const SOURCE_CHANNEL_VALUES = SOURCE_CHANNEL_FILTER_OPTIONS
  .map((o) => o.value)
  .filter((v) => v !== BUILD_FILTER_ALL) as FeedbucketSourceChannel[];

const SENTIMENT_VALUES = SENTIMENT_FILTER_OPTIONS
  .map((o) => o.value)
  .filter((v) => v !== BUILD_FILTER_ALL) as FeedbucketSentiment[];

const CONSENT_VALUES = CONSENT_FILTER_OPTIONS
  .map((o) => o.value)
  .filter((v) => v !== BUILD_FILTER_ALL) as FeedbucketConsentStatus[];

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
  sourceChannelValue: string;
  themeValue: string;
  sentimentValue: string;
  consentStatusValue: string;
  linkedToOpportunityValue: string;
  typedFrom: string | undefined;
  typedTo: string | undefined;
  typedAssigneeId: string | undefined;
  paneSubmissionId: number | null;
  isFiltered: boolean;
  handleTypeChange: (value: string) => void;
  handleStatusChange: (value: string) => void;
  handleLinkedChange: (value: string) => void;
  handleAssigneeChange: (value: string) => void;
  handleDuplicateChange: (value: string) => void;
  handleSourceChannelChange: (value: string) => void;
  handleThemeChange: (value: string) => void;
  handleSentimentChange: (value: string) => void;
  handleConsentStatusChange: (value: string) => void;
  handleLinkedToOpportunityChange: (value: string) => void;
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
  const sourceChannelValue = listFilters.value("sourceChannel");
  const themeValue = listFilters.value("theme");
  const sentimentValue = listFilters.value("sentiment");
  const consentStatusValue = listFilters.value("consentStatus");
  const linkedToOpportunityValue = listFilters.value("linkedToOpportunity");
  const submissionIdRaw = listFilters.value("submission");

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

  const typedSourceChannel = useMemo(
    () => SOURCE_CHANNEL_VALUES.includes(sourceChannelValue as FeedbucketSourceChannel)
      ? [sourceChannelValue as FeedbucketSourceChannel]
      : undefined,
    [sourceChannelValue],
  );

  const typedTheme = useMemo(
    () => themeValue && themeValue !== BUILD_FILTER_ALL
      ? themeValue === "untagged" ? [""] : [themeValue]
      : undefined,
    [themeValue],
  );

  const typedSentiment = useMemo(
    () => SENTIMENT_VALUES.includes(sentimentValue as FeedbucketSentiment)
      ? [sentimentValue as FeedbucketSentiment]
      : undefined,
    [sentimentValue],
  );

  const typedConsentStatus = useMemo(
    () => CONSENT_VALUES.includes(consentStatusValue as FeedbucketConsentStatus)
      ? [consentStatusValue as FeedbucketConsentStatus]
      : undefined,
    [consentStatusValue],
  );

  const typedLinkedToOpportunity = useMemo(
    () =>
      linkedToOpportunityValue === "true" || linkedToOpportunityValue === "false"
        ? linkedToOpportunityValue
        : undefined,
    [linkedToOpportunityValue],
  );

  const paneSubmissionId = useMemo(() => {
    const n = submissionIdRaw ? parseInt(submissionIdRaw, 10) : NaN;
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [submissionIdRaw]);

  const [page, setPage] = useSourceOverride(listFilters.resetKey, 1);
  const [selected, setSelected] = useSourceOverride(listFilters.resetKey, new Set<string | number>());

  const isFiltered = useMemo(
    () =>
      !!(
        typedType ||
        typedStatus ||
        typedLinked ||
        typedAssigneeId ||
        typedDuplicate ||
        typedFrom ||
        typedTo ||
        typedSourceChannel ||
        typedTheme ||
        typedSentiment ||
        typedConsentStatus ||
        typedLinkedToOpportunity ||
        listFilters.debouncedSearch.trim()
      ),
    [
      typedType, typedStatus, typedLinked, typedAssigneeId, typedDuplicate,
      typedFrom, typedTo, typedSourceChannel, typedTheme, typedSentiment,
      typedConsentStatus, typedLinkedToOpportunity, listFilters.debouncedSearch,
    ],
  );

  const queryParams = useMemo(
    (): ListFeedbucketSubmissionsQuery => ({
      managedProductId,
      page,
      limit: PAGE_SIZE,
      ...(listFilters.debouncedSearch.trim() ? { search: listFilters.debouncedSearch.trim() } : {}),
      ...(typedType ? { type: typedType } : {}),
      ...(typedStatus ? { status: typedStatus } : {}),
      ...(typedLinked ? { linked: typedLinked } : {}),
      ...(typedAssigneeId ? { assigneeId: typedAssigneeId } : {}),
      ...(typedDuplicate ? { duplicate: typedDuplicate } : {}),
      ...(typedFrom ? { from: typedFrom } : {}),
      ...(typedTo ? { to: typedTo } : {}),
      ...(typedSourceChannel ? { sourceChannel: typedSourceChannel } : {}),
      ...(typedTheme ? { theme: typedTheme } : {}),
      ...(typedSentiment ? { sentiment: typedSentiment } : {}),
      ...(typedConsentStatus ? { consentStatus: typedConsentStatus } : {}),
      ...(typedLinkedToOpportunity ? { linkedToOpportunity: typedLinkedToOpportunity } : {}),
    }),
    [
      managedProductId, page, listFilters.debouncedSearch,
      typedType, typedStatus, typedLinked, typedAssigneeId, typedDuplicate,
      typedFrom, typedTo, typedSourceChannel, typedTheme, typedSentiment,
      typedConsentStatus, typedLinkedToOpportunity,
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
      ...(typedSourceChannel ? { sourceChannel: typedSourceChannel } : {}),
      ...(typedTheme ? { theme: typedTheme } : {}),
      ...(typedSentiment ? { sentiment: typedSentiment } : {}),
      ...(typedConsentStatus ? { consentStatus: typedConsentStatus } : {}),
      ...(typedLinkedToOpportunity ? { linkedToOpportunity: typedLinkedToOpportunity } : {}),
      ...(listFilters.debouncedSearch.trim() ? { search: listFilters.debouncedSearch.trim() } : {}),
    }),
    [
      managedProductId, typedType, typedStatus, typedLinked, typedAssigneeId, typedDuplicate,
      typedFrom, typedTo, typedSourceChannel, typedTheme, typedSentiment,
      typedConsentStatus, typedLinkedToOpportunity, listFilters.debouncedSearch,
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

  const handleSourceChannelChange = useCallback(
    (value: string) => listFilters.setValue("sourceChannel", value),
    [listFilters],
  );

  const handleThemeChange = useCallback(
    (value: string) => listFilters.setValue("theme", value),
    [listFilters],
  );

  const handleSentimentChange = useCallback(
    (value: string) => listFilters.setValue("sentiment", value),
    [listFilters],
  );

  const handleConsentStatusChange = useCallback(
    (value: string) => listFilters.setValue("consentStatus", value),
    [listFilters],
  );

  const handleLinkedToOpportunityChange = useCallback(
    (value: string) => listFilters.setValue("linkedToOpportunity", value),
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
    sourceChannelValue,
    themeValue,
    sentimentValue,
    consentStatusValue,
    linkedToOpportunityValue,
    typedFrom,
    typedTo,
    typedAssigneeId,
    paneSubmissionId,
    isFiltered,
    handleTypeChange,
    handleStatusChange,
    handleLinkedChange,
    handleAssigneeChange,
    handleDuplicateChange,
    handleSourceChannelChange,
    handleThemeChange,
    handleSentimentChange,
    handleConsentStatusChange,
    handleLinkedToOpportunityChange,
    handleDateRangeChange: listFilters.setValues,
    handlePageChange,
    handleClearSelection,
  };
}
