"use client";

import { useRef, useTransition } from "react";
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

  function writePaneParams(updates: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null) next.delete(key);
      else next.set(key, value);
    }
    const query = next.toString();
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    });
  }

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

  const typedType = TYPE_OPTIONS.find((v) => v === typeValue);
  const typedStatusVals = splitMulti(statusValue)
    .filter((v) => (STATUS_OPTIONS_VALUES as readonly string[]).includes(v)) as typeof STATUS_OPTIONS_VALUES[number][];
  const typedStatuses = typedStatusVals.length > 0 ? typedStatusVals : undefined;
  const typedLinked = linkedValue === "linked" || linkedValue === "unlinked" ? linkedValue : undefined;
  const typedAssigneeVals = splitMulti(assigneeIdValue).filter((v) => v !== BUILD_FILTER_ALL);
  const typedAssigneeIds = typedAssigneeVals.length > 0 ? typedAssigneeVals : undefined;
  const typedDuplicate = duplicateValue === "true" || duplicateValue === "false" ? duplicateValue : undefined;
  const typedFrom = isoDateParam(fromValue, listFilters.isActive("from"));
  const typedTo = isoDateParam(toValue, listFilters.isActive("to"));
  const dateRangeReversed = Boolean(typedFrom && typedTo && typedFrom > typedTo);

  const scVals = splitMulti(sourceChannelRaw)
    .filter((v) => SOURCE_CHANNEL_VALUES.includes(v as FeedbucketSourceChannel)) as FeedbucketSourceChannel[];
  const typedSourceChannel = scVals.length > 0 ? scVals : undefined;

  const themeVals = splitMulti(themeRaw);
  const typedTheme = themeVals.length > 0 ? themeVals.map((v) => (v === "untagged" ? "" : v)) : undefined;

  const sentimentVals = splitMulti(sentimentRaw)
    .filter((v) => SENTIMENT_VALUES.includes(v as FeedbucketSentiment)) as FeedbucketSentiment[];
  const typedSentiment = sentimentVals.length > 0 ? sentimentVals : undefined;

  const typedConsentStatus = CONSENT_VALUES.includes(consentStatusValue as FeedbucketConsentStatus)
    ? [consentStatusValue as FeedbucketConsentStatus]
    : undefined;
  const typedLinkedToOpportunity = linkedToOpportunityValue === "true" || linkedToOpportunityValue === "false"
    ? linkedToOpportunityValue
    : undefined;

  const segVals = splitMulti(segmentRaw);
  const typedSegment = segVals.length > 0 ? segVals : undefined;

  const crmIds = splitMulti(crmOrgIdRaw)
    .map((v) => parseInt(v, 10))
    .filter((n) => Number.isFinite(n) && n > 0);
  const typedCrmOrgId = crmIds.length > 0 ? crmIds : undefined;

  const subN = submissionIdRaw ? parseInt(submissionIdRaw, 10) : NaN;
  const paneSubmissionId = Number.isFinite(subN) && subN > 0 ? subN : null;
  const tickN = ticketIdRaw ? parseInt(ticketIdRaw, 10) : NaN;
  const paneTicketId = Number.isFinite(tickN) && tickN > 0 ? tickN : null;
  const projN = ticketProjectIdRaw ? parseInt(ticketProjectIdRaw, 10) : NaN;
  const paneTicketProjectId = Number.isFinite(projN) && projN > 0 ? projN : null;

  const [selected, setSelected] = useSourceOverride(listFilters.resetKey, new Set<string | number>());

  const isFiltered = !!(
    typedType || typedStatuses || typedLinked || typedAssigneeIds || typedDuplicate ||
    typedFrom || typedTo || typedSourceChannel || typedTheme || typedSentiment ||
    typedConsentStatus || typedLinkedToOpportunity || typedSegment || typedCrmOrgId ||
    listFilters.debouncedSearch.trim()
  );

  const filterCore: FeedbucketSubmissionFilters = {
    managedProductId,
    ...(typedType && { type: typedType }),
    ...(typedStatuses && { status: typedStatuses }),
    ...(typedLinked && { linked: typedLinked }),
    ...(typedAssigneeIds && { assigneeId: typedAssigneeIds }),
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
  };

  const queryParams: ListFeedbucketSubmissionsQuery = { ...filterCore, page, limit: PAGE_SIZE };
  const bulkFilters = filterCore;

  function handleTypeChange(v: string) { listFilters.setValue("type", v); }
  function handleLinkedChange(v: string) { listFilters.setValue("linked", v); }
  function handleStatusValuesChange(vals: string[]) {
    listFilters.setValue("status", vals.length > 0 ? vals.join(",") : BUILD_FILTER_ALL);
  }
  function handleAssigneeValuesChange(vals: string[]) {
    listFilters.setValue("assigneeId", vals.length > 0 ? vals.join(",") : BUILD_FILTER_ALL);
  }
  function handleDuplicateChange(v: string) { listFilters.setValue("duplicate", v); }
  function handleConsentStatusChange(v: string) { listFilters.setValue("consentStatus", v); }
  function handleLinkedToOpportunityChange(v: string) { listFilters.setValue("linkedToOpportunity", v); }
  function handleClearSelection() { setSelected(new Set()); }
  function handleOpenSubmission(submissionId: number) {
    writePaneParams({ submission: String(submissionId) });
  }
  function handleCloseSubmissionPane() { writePaneParams({ submission: null }); }
  function handleOpenTicket(ticketId: number, projectId: number) {
    writePaneParams({ ticket: String(ticketId), ticketProject: String(projectId) });
  }
  function handleCloseTicketPane() { writePaneParams({ ticket: null, ticketProject: null }); }
  function handlePageChange(newPage: number) {
    const next = new URLSearchParams(searchParams.toString());
    if (newPage <= 1) next.delete("page");
    else next.set("page", String(newPage));
    const query = next.toString();
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    });
  }
  function handleSourceChannelValuesChange(vals: string[]) {
    listFilters.setValue("sourceChannel", vals.length > 0 ? vals.join(",") : BUILD_FILTER_ALL);
  }
  function handleThemeValuesChange(vals: string[]) {
    listFilters.setValue("theme", vals.length > 0 ? vals.join(",") : BUILD_FILTER_ALL);
  }
  function handleSentimentValuesChange(vals: string[]) {
    listFilters.setValue("sentiment", vals.length > 0 ? vals.join(",") : BUILD_FILTER_ALL);
  }
  function handleSegmentValuesChange(vals: string[]) {
    listFilters.setValue("segment", vals.length > 0 ? vals.join(",") : BUILD_FILTER_ALL);
  }
  function handleCrmOrgValuesChange(vals: string[]) {
    listFilters.setValue("crmOrganizationId", vals.length > 0 ? vals.join(",") : BUILD_FILTER_ALL);
  }

  return {
    listFilters,
    searchInputRef,
    page,
    selected,
    setSelected,
    queryParams,
    bulkFilters,
    managedProductId,
    typeValue,
    linkedValue,
    assigneeIdValue,
    duplicateValue,
    consentStatusValue,
    linkedToOpportunityValue,
    typedFrom,
    typedTo,
    paneSubmissionId,
    dateRangeReversed,
    isFiltered,
    appliedStatuses: typedStatuses,
    appliedAssigneeIds: typedAssigneeIds,
    appliedSourceChannels: typedSourceChannel,
    appliedThemes: typedTheme ? typedTheme.map((v) => (v === "" ? "untagged" : v)) : undefined,
    appliedSentiments: typedSentiment,
    appliedSegments: typedSegment,
    appliedCrmOrgIds: typedCrmOrgId ? typedCrmOrgId.map(String) : undefined,
    appliedConsentStatus: typedConsentStatus?.[0],
    handleTypeChange,
    handleLinkedChange,
    handleDuplicateChange,
    handleConsentStatusChange,
    handleLinkedToOpportunityChange,
    handleStatusValuesChange,
    handleAssigneeValuesChange,
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
