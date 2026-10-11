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

function wireDateTime(value: string, bound: "from" | "to"): string {
  if (value.includes("T")) return value;
  return bound === "from" ? `${value}T00:00:00.000Z` : `${value}T23:59:59.999Z`;
}

function isoDateParam(value: string | undefined, active: boolean): string | undefined {
  if (!active || !value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return undefined;
  }
  return value;
}

const SOURCE_CHANNEL_VALUES = SOURCE_CHANNEL_FILTER_OPTIONS
  .map((o) => o.value)
  .filter((v) => v !== BUILD_FILTER_ALL) as FeedbucketSourceChannel[];

const SENTIMENT_VALUES = SENTIMENT_FILTER_OPTIONS
  .map((o) => o.value)
  .filter((v) => v !== BUILD_FILTER_ALL) as FeedbucketSentiment[];

const CONSENT_VALUES = CONSENT_FILTER_OPTIONS
  .map((o) => o.value)
  .filter((v) => v !== BUILD_FILTER_ALL) as FeedbucketConsentStatus[];

export const PAGE_SIZE = 25;

export function useProductFeedbackFilters(managedProductId: number) {
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
  const segmentValue = listFilters.value("segment");
  const crmOrgIdValue = listFilters.value("crmOrganizationId");
  const submissionIdRaw = listFilters.value("submission");

  const typedType = useMemo(() => TYPE_OPTIONS.find((v) => v === typeValue), [typeValue]);
  const typedStatus = useMemo(() => STATUS_OPTIONS_VALUES.find((v) => v === statusValue), [statusValue]);
  const typedLinked = useMemo(
    () => linkedValue === "linked" || linkedValue === "unlinked" ? linkedValue : undefined,
    [linkedValue],
  );
  const typedAssigneeId = useMemo(() => {
    const trimmed = assigneeIdValue.trim();
    return trimmed && trimmed !== BUILD_FILTER_ALL ? trimmed : undefined;
  }, [assigneeIdValue]);
  const typedDuplicate = useMemo(
    () => duplicateValue === "true" || duplicateValue === "false" ? duplicateValue : undefined,
    [duplicateValue],
  );
  const typedFrom = isoDateParam(fromValue, listFilters.isActive("from"));
  const typedTo = isoDateParam(toValue, listFilters.isActive("to"));
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
    () => linkedToOpportunityValue === "true" || linkedToOpportunityValue === "false"
      ? linkedToOpportunityValue
      : undefined,
    [linkedToOpportunityValue],
  );
  const typedSegment = useMemo(() => {
    const trimmed = segmentValue?.trim();
    return trimmed && trimmed !== BUILD_FILTER_ALL ? [trimmed] : undefined;
  }, [segmentValue]);
  const typedCrmOrgId = useMemo(() => {
    const n = crmOrgIdValue ? parseInt(crmOrgIdValue, 10) : NaN;
    return Number.isFinite(n) && n > 0 ? [n] : undefined;
  }, [crmOrgIdValue]);
  const paneSubmissionId = useMemo(() => {
    const n = submissionIdRaw ? parseInt(submissionIdRaw, 10) : NaN;
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [submissionIdRaw]);

  const [page, setPage] = useSourceOverride(listFilters.resetKey, 1);
  const [selected, setSelected] = useSourceOverride(listFilters.resetKey, new Set<string | number>());

  const isFiltered = useMemo(
    () => !!(
      typedType || typedStatus || typedLinked || typedAssigneeId || typedDuplicate ||
      typedFrom || typedTo || typedSourceChannel || typedTheme || typedSentiment ||
      typedConsentStatus || typedLinkedToOpportunity || typedSegment || typedCrmOrgId ||
      listFilters.debouncedSearch.trim()
    ),
    [
      typedType, typedStatus, typedLinked, typedAssigneeId, typedDuplicate,
      typedFrom, typedTo, typedSourceChannel, typedTheme, typedSentiment,
      typedConsentStatus, typedLinkedToOpportunity, typedSegment, typedCrmOrgId,
      listFilters.debouncedSearch,
    ],
  );

  const filterCore = useMemo((): FeedbucketSubmissionFilters => ({
    managedProductId,
    ...(typedType && { type: typedType }),
    ...(typedStatus && { status: typedStatus }),
    ...(typedLinked && { linked: typedLinked }),
    ...(typedAssigneeId && { assigneeId: typedAssigneeId }),
    ...(typedDuplicate && { duplicate: typedDuplicate }),
    ...(typedFrom && { from: wireDateTime(typedFrom, "from") }),
    ...(typedTo && { to: wireDateTime(typedTo, "to") }),
    ...(typedSourceChannel && { sourceChannel: typedSourceChannel }),
    ...(typedTheme && { theme: typedTheme }),
    ...(typedSentiment && { sentiment: typedSentiment }),
    ...(typedConsentStatus && { consentStatus: typedConsentStatus }),
    ...(typedLinkedToOpportunity && { linkedToOpportunity: typedLinkedToOpportunity }),
    ...(typedSegment && { segment: typedSegment }),
    ...(typedCrmOrgId && { crmOrganizationId: typedCrmOrgId }),
    ...(listFilters.debouncedSearch.trim() && { search: listFilters.debouncedSearch.trim() }),
  }), [
    managedProductId, typedType, typedStatus, typedLinked, typedAssigneeId, typedDuplicate,
    typedFrom, typedTo, typedSourceChannel, typedTheme, typedSentiment,
    typedConsentStatus, typedLinkedToOpportunity, typedSegment, typedCrmOrgId,
    listFilters.debouncedSearch,
  ]);

  const queryParams = useMemo(
    (): ListFeedbucketSubmissionsQuery => ({ ...filterCore, page, limit: PAGE_SIZE }),
    [filterCore, page],
  );

  const bulkFilters = filterCore;

  const handleTypeChange = useCallback((v: string) => listFilters.setValue("type", v), [listFilters]);
  const handleStatusChange = useCallback((v: string) => listFilters.setValue("status", v), [listFilters]);
  const handleLinkedChange = useCallback((v: string) => listFilters.setValue("linked", v), [listFilters]);
  const handleAssigneeChange = useCallback(
    (v: string) => listFilters.setValue("assigneeId", v || BUILD_FILTER_ALL),
    [listFilters],
  );
  const handleDuplicateChange = useCallback((v: string) => listFilters.setValue("duplicate", v), [listFilters]);
  const handleSourceChannelChange = useCallback((v: string) => listFilters.setValue("sourceChannel", v), [listFilters]);
  const handleThemeChange = useCallback((v: string) => listFilters.setValue("theme", v), [listFilters]);
  const handleSentimentChange = useCallback((v: string) => listFilters.setValue("sentiment", v), [listFilters]);
  const handleConsentStatusChange = useCallback((v: string) => listFilters.setValue("consentStatus", v), [listFilters]);
  const handleLinkedToOpportunityChange = useCallback((v: string) => listFilters.setValue("linkedToOpportunity", v), [listFilters]);
  const handleSegmentChange = useCallback((v: string) => listFilters.setValue("segment", v), [listFilters]);
  const handleCrmOrgChange = useCallback((v: string) => listFilters.setValue("crmOrganizationId", v), [listFilters]);
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
    segmentValue,
    crmOrgIdValue,
    typedFrom,
    typedTo,
    typedAssigneeId,
    paneSubmissionId,
    isFiltered,
    appliedSegment: typedSegment?.[0],
    appliedTheme: typedTheme
      ? typedTheme[0] === "" ? "untagged" : typedTheme[0]
      : undefined,
    appliedCrmOrgId: typedCrmOrgId ? String(typedCrmOrgId[0]) : undefined,
    appliedSourceChannel: typedSourceChannel?.[0],
    appliedSentiment: typedSentiment?.[0],
    appliedConsentStatus: typedConsentStatus?.[0],
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
    handleSegmentChange,
    handleCrmOrgChange,
    handleDateRangeChange: listFilters.setValues,
    handlePageChange: setPage,
    handleClearSelection,
  };
}
