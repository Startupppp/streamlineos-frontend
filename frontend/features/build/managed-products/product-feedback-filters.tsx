"use client";

import { useMemo } from "react";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { UserCombobox } from "@/components/ui/user-combobox";
import {
  TYPE_FILTER_OPTIONS,
  STATUS_FILTER_OPTIONS,
  LINKED_FILTER_OPTIONS,
  DUPLICATE_FILTER_OPTIONS,
  SOURCE_CHANNEL_FILTER_OPTIONS,
  SENTIMENT_FILTER_OPTIONS,
  CONSENT_FILTER_OPTIONS,
  LINKED_OPP_FILTER_OPTIONS,
} from "./product-feedback-columns";
import type { useProductFeedbackFilters } from "./use-product-feedback-filters";

interface FacetsData {
  themes?: Array<{ value: string | null; count: number }>;
  segments?: Array<{ value: string | null; count: number }>;
}

interface CrmOrgsData {
  organizations?: Array<{ id: number; name: string }>;
}

interface ProductFeedbackFiltersProps {
  filterState: ReturnType<typeof useProductFeedbackFilters>;
  facetsData: FacetsData | undefined;
  crmOrgsData: CrmOrgsData | undefined;
}

export function ProductFeedbackFilters({
  filterState,
  facetsData,
  crmOrgsData,
}: ProductFeedbackFiltersProps) {
  const {
    listFilters,
    searchInputRef,
    typeValue,
    statusValue,
    linkedValue,
    duplicateValue,
    linkedToOpportunityValue,
    typedFrom,
    typedTo,
    typedAssigneeId,
    appliedSegment,
    appliedTheme,
    appliedCrmOrgId,
    appliedSourceChannel,
    appliedSentiment,
    appliedConsentStatus,
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
    handleDateRangeChange,
  } = filterState;

  const themeOptions = useMemo(() => {
    const options = [
      { value: "all", label: "All themes" },
      { value: "untagged", label: "Untagged" },
      ...(facetsData?.themes ?? [])
        .filter((t): t is { value: string; count: number } => t.value !== null)
        .map((t) => ({ value: t.value, label: t.value })),
    ];
    if (appliedTheme && !options.some((option) => option.value === appliedTheme)) {
      options.push({ value: appliedTheme, label: appliedTheme });
    }
    return options;
  }, [appliedTheme, facetsData?.themes]);

  const segmentOptions = useMemo(() => {
    const options = [
      { value: "all", label: "All segments" },
      ...(facetsData?.segments ?? [])
        .filter((s): s is { value: string; count: number } => s.value !== null)
        .map((s) => ({ value: s.value, label: s.value })),
    ];
    if (appliedSegment && !options.some((option) => option.value === appliedSegment)) {
      options.push({ value: appliedSegment, label: appliedSegment });
    }
    return options;
  }, [appliedSegment, facetsData?.segments]);

  const customerOptions = useMemo(() => {
    const options = [
      { value: "all", label: "All customers" },
      ...(crmOrgsData?.organizations ?? []).map((o) => ({
        value: String(o.id),
        label: o.name,
      })),
    ];
    if (appliedCrmOrgId && !options.some((option) => option.value === appliedCrmOrgId)) {
      options.push({ value: appliedCrmOrgId, label: `Customer ${appliedCrmOrgId}` });
    }
    return options;
  }, [appliedCrmOrgId, crmOrgsData?.organizations]);

  return (
    <BuildListToolbar
      search={{
        value: listFilters.search,
        onValueChange: listFilters.setSearch,
        placeholder: "Search feedback…",
        label: "Search feedback",
        inputRef: searchInputRef,
      }}
      filters={[
        {
          id: "type",
          label: "Type",
          active: listFilters.isActive("type"),
          control: (
            <BuildFilterSelect
              label="Type"
              value={typeValue}
              onValueChange={handleTypeChange}
              options={TYPE_FILTER_OPTIONS}
            />
          ),
        },
        {
          id: "status",
          label: "Status",
          active: listFilters.isActive("status"),
          control: (
            <BuildFilterSelect
              label="Status"
              value={statusValue}
              onValueChange={handleStatusChange}
              options={STATUS_FILTER_OPTIONS}
            />
          ),
        },
        {
          id: "sourceChannel",
          label: "Channel",
          active: appliedSourceChannel !== undefined,
          control: (
            <BuildFilterSelect
              label="Channel"
              value={appliedSourceChannel ?? "all"}
              onValueChange={handleSourceChannelChange}
              options={SOURCE_CHANNEL_FILTER_OPTIONS}
            />
          ),
        },
        {
          id: "theme",
          label: "Theme",
          active: appliedTheme !== undefined,
          control: (
            <BuildFilterSelect
              label="Theme"
              value={appliedTheme ?? "all"}
              onValueChange={handleThemeChange}
              options={themeOptions}
            />
          ),
        },
        {
          id: "segment",
          label: "Segment",
          active: appliedSegment !== undefined,
          control: (
            <BuildFilterSelect
              label="Segment"
              value={appliedSegment ?? "all"}
              onValueChange={handleSegmentChange}
              options={segmentOptions}
            />
          ),
        },
        {
          id: "customer",
          label: "Customer",
          active: appliedCrmOrgId !== undefined,
          control: (
            <BuildFilterSelect
              label="Customer"
              value={appliedCrmOrgId ?? "all"}
              onValueChange={handleCrmOrgChange}
              options={customerOptions}
            />
          ),
        },
        {
          id: "sentiment",
          label: "Sentiment",
          active: appliedSentiment !== undefined,
          control: (
            <BuildFilterSelect
              label="Sentiment"
              value={appliedSentiment ?? "all"}
              onValueChange={handleSentimentChange}
              options={SENTIMENT_FILTER_OPTIONS}
            />
          ),
        },
        {
          id: "consentStatus",
          label: "Consent",
          active: appliedConsentStatus !== undefined,
          control: (
            <BuildFilterSelect
              label="Consent"
              value={appliedConsentStatus ?? "all"}
              onValueChange={handleConsentStatusChange}
              options={CONSENT_FILTER_OPTIONS}
            />
          ),
        },
        {
          id: "linked",
          label: "Linked",
          active: listFilters.isActive("linked"),
          control: (
            <BuildFilterSelect
              label="Linked"
              value={linkedValue}
              onValueChange={handleLinkedChange}
              options={LINKED_FILTER_OPTIONS}
            />
          ),
        },
        {
          id: "linkedToOpportunity",
          label: "Opportunity",
          active: listFilters.isActive("linkedToOpportunity"),
          control: (
            <BuildFilterSelect
              label="Opportunity"
              value={linkedToOpportunityValue}
              onValueChange={handleLinkedToOpportunityChange}
              options={LINKED_OPP_FILTER_OPTIONS}
            />
          ),
        },
        {
          id: "duplicate",
          label: "Duplicates",
          active: listFilters.isActive("duplicate"),
          control: (
            <BuildFilterSelect
              label="Duplicates"
              value={duplicateValue}
              onValueChange={handleDuplicateChange}
              options={DUPLICATE_FILTER_OPTIONS}
            />
          ),
        },
        {
          id: "assignee",
          label: "Assignee",
          active: typedAssigneeId !== undefined,
          control: (
            <UserCombobox
              value={typedAssigneeId ?? ""}
              onChange={handleAssigneeChange}
              placeholder="Select member…"
            />
          ),
        },
        {
          id: "date-range",
          label: "Date range",
          active: Boolean(typedFrom || typedTo),
          control: (
            <DateRangePicker
              from={typedFrom}
              to={typedTo}
              onChange={handleDateRangeChange}
              placeholder="Filter by submission date…"
            />
          ),
        },
      ]}
      onClearAll={listFilters.clearAll}
    />
  );
}
