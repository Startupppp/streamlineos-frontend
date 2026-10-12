"use client";

import { useCallback, useMemo, useRef, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
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

function splitMulti(raw: string): string[] {
  if (!raw || raw === BUILD_FILTER_ALL) return [];
  return raw.split(",").map((v) => v.trim()).filter(Boolean);
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
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const listFilters = useBuildListFilters({ filters: FILTER_DEFINITIONS });
  const searchParams = listFilters.searchParams;
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const writePaneParams = useCallback(
    (updates: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null) next.delete(key);
        else next.set(key, value);
      }
      const query = next.toString();
      startTransition(() => {
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
      });
    },
    [pathname, router, searchParams],
  );

  const pageRaw = searchParams.get("page");
  const page = Math.max(1, parseInt(pageRaw ?? "1", 10) || 1);

  const typeValue = listFilters.value("type");
  const statusValue = listFilters.value("status");
  const linkedValue = listFilters.value("linked");
  const assigneeIdValue = listFilters.value("assigneeId");
  const duplicateValue = listFilters.value("duplicate");
  const fromValue = listFilters.value("from");
  const toValue = listFilters.value("to");
  const sourceChannelRaw = listFilters.value("sourceChannel");
  const themeRaw = listFilters.value("theme");
  const sentimentRaw = listFilters.value("sentiment");
  const consentStatusValue = listFilters.value("consentStatus");
  const linkedToOpportunityValue = listFilters.value("linkedToOpportunity");
  const segmentRaw = listFilters.value("segment");
  const crmOrgIdRaw = listFilters.value("crmOrganizationId");
  const submissionIdRaw = listFilters.value("submission");
  const ticketIdRaw = listFilters.value("ticket");
  const ticketProjectIdRaw = listFilters.value("ticketProject");

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
  const dateRangeReversed = Boolean(typedFrom && typedTo && typedFrom > typedTo);

  const typedSourceChannel = useMemo(() => {
    const vals = splitMulti(sourceChannelRaw)
      .filter((v) => SOURCE_CHANNEL_VALUES.includes(v as FeedbucketSourceChannel)) as FeedbucketSourceChannel[];
    return vals.length > 0 ? vals : undefined;
  }, [sourceChannelRaw]);

  const typedTheme = useMemo(() => {
    const vals = splitMulti(themeRaw);
    if (vals.length === 0) return undefined;
    return vals.map((v) => (v === "untagged" ? "" : v));
  }, [themeRaw]);

  const typedSentiment = useMemo(() => {
    const vals = splitMulti(sentimentRaw)
      .filter((v) => SENTIMENT_VALUES.includes(v as FeedbucketSentiment)) as FeedbucketSentiment[];
    return vals.length > 0 ? vals : undefined;
  }, [sentimentRaw]);

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
    const vals = splitMulti(segmentRaw);
    return vals.length > 0 ? vals : undefined;
  }, [segmentRaw]);

  const typedCrmOrgId = useMemo(() => {
    const ids = splitMulti(crmOrgIdRaw)
      .map((v) => parseInt(v, 10))
      .filter((n) => Number.isFinite(n) && n > 0);
    return ids.length > 0 ? ids : undefined;
  }, [crmOrgIdRaw]);

  const paneSubmissionId = useMemo(() => {
    const n = submissionIdRaw ? parseInt(submissionIdRaw, 10) : NaN;
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [submissionIdRaw]);
  const paneTicketId = useMemo(() => {
    const n = ticketIdRaw ? parseInt(ticketIdRaw, 10) : NaN;
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [ticketIdRaw]);
  const paneTicketProjectId = useMemo(() => {
    const n = ticketProjectIdRaw ? parseInt(ticketProjectIdRaw, 10) : NaN;
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [ticketProjectIdRaw]);

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
    ...(!dateRangeReversed && typedFrom && { from: wireDateTime(typedFrom, "from") }),
    ...(!dateRangeReversed && typedTo && { to: wireDateTime(typedTo, "to") }),
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
    dateRangeReversed, typedFrom, typedTo, typedSourceChannel, typedTheme, typedSentiment,
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
  const handleConsentStatusChange = useCallback((v: string) => listFilters.setValue("consentStatus", v), [listFilters]);
  const handleLinkedToOpportunityChange = useCallback((v: string) => listFilters.setValue("linkedToOpportunity", v), [listFilters]);
  const handleClearSelection = useCallback(() => setSelected(new Set()), [setSelected]);
  const handleOpenSubmission = useCallback(
    (submissionId: number) => writePaneParams({ submission: String(submissionId) }),
    [writePaneParams],
  );
  const handleCloseSubmissionPane = useCallback(
    () => writePaneParams({ submission: null }),
    [writePaneParams],
  );
  const handleOpenTicket = useCallback(
    (ticketId: number, projectId: number) => {
      writePaneParams({ ticket: String(ticketId), ticketProject: String(projectId) });
    },
    [writePaneParams],
  );
  const handleCloseTicketPane = useCallback(
    () => writePaneParams({ ticket: null, ticketProject: null }),
    [writePaneParams],
  );
  const handlePageChange = useCallback(
    (newPage: number) => {
      const next = new URLSearchParams(searchParams.toString());
      if (newPage <= 1) next.delete("page");
      else next.set("page", String(newPage));
      const query = next.toString();
      startTransition(() => {
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
      });
    },
    [pathname, router, searchParams],
  );

  const handleSourceChannelValuesChange = useCallback(
    (vals: string[]) => listFilters.setValue("sourceChannel", vals.length > 0 ? vals.join(",") : BUILD_FILTER_ALL),
    [listFilters],
  );
  const handleThemeValuesChange = useCallback(
    (vals: string[]) => listFilters.setValue("theme", vals.length > 0 ? vals.join(",") : BUILD_FILTER_ALL),
    [listFilters],
  );
  const handleSentimentValuesChange = useCallback(
    (vals: string[]) => listFilters.setValue("sentiment", vals.length > 0 ? vals.join(",") : BUILD_FILTER_ALL),
    [listFilters],
  );
  const handleSegmentValuesChange = useCallback(
    (vals: string[]) => listFilters.setValue("segment", vals.length > 0 ? vals.join(",") : BUILD_FILTER_ALL),
    [listFilters],
  );
  const handleCrmOrgValuesChange = useCallback(
    (vals: string[]) => listFilters.setValue("crmOrganizationId", vals.length > 0 ? vals.join(",") : BUILD_FILTER_ALL),
    [listFilters],
  );

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
    consentStatusValue,
    linkedToOpportunityValue,
    typedFrom,
    typedTo,
    typedAssigneeId,
    paneSubmissionId,
    dateRangeReversed,
    isFiltered,
    appliedSourceChannels: typedSourceChannel,
    appliedThemes: typedTheme ? typedTheme.map((v) => (v === "" ? "untagged" : v)) : undefined,
    appliedSentiments: typedSentiment,
    appliedSegments: typedSegment,
    appliedCrmOrgIds: typedCrmOrgId ? typedCrmOrgId.map(String) : undefined,
    appliedConsentStatus: typedConsentStatus?.[0],
    handleTypeChange,
    handleStatusChange,
    handleLinkedChange,
    handleAssigneeChange,
    handleDuplicateChange,
    handleConsentStatusChange,
    handleLinkedToOpportunityChange,
    handleSourceChannelValuesChange,
    handleThemeValuesChange,
    handleSentimentValuesChange,
    handleSegmentValuesChange,
    handleCrmOrgValuesChange,
    handleDateRangeChange: listFilters.setValues,
    handlePageChange,
    handleClearSelection,
    paneTicketId,
    paneTicketProjectId,
    handleOpenSubmission,
    handleCloseSubmissionPane,
    handleOpenTicket,
    handleCloseTicketPane,
  };
}
