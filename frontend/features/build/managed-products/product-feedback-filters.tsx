"use client";

import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import { BuildMultiFilterSelect } from "@/features/build/shared/build-multi-filter-select";
import { FilterChip } from "@/features/build/shared/filter-chip";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import {
  TYPE_FILTER_OPTIONS,
  LINKED_FILTER_OPTIONS,
  DUPLICATE_FILTER_OPTIONS,
  CONSENT_FILTER_OPTIONS,
  LINKED_OPP_FILTER_OPTIONS,
} from "./product-feedback-columns";
import { useProductFeedbackFilterOptions, SOURCE_CHANNEL_OPTIONS_MULTI, SENTIMENT_OPTIONS_MULTI, STATUS_OPTIONS_MULTI } from "./use-product-feedback-filter-options";
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
    linkedValue,
    duplicateValue,
    linkedToOpportunityValue,
    consentStatusValue,
    typedFrom,
    typedTo,
    appliedStatuses,
    appliedAssigneeIds,
    appliedSourceChannels,
    appliedThemes,
    appliedSentiments,
    appliedSegments,
    appliedCrmOrgIds,
    appliedConsentStatus,
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
    handleDateRangeChange,
  } = filterState;

  const { memberOptions, themeOptionsMulti, segmentOptionsMulti, customerOptionsMulti, chips } =
    useProductFeedbackFilterOptions(filterState, facetsData, crmOrgsData);

  return (
    <div className="flex flex-col gap-1">
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
            active: (appliedStatuses?.length ?? 0) > 0,
            control: (
              <BuildMultiFilterSelect
                label="Status"
                values={appliedStatuses ?? []}
                onValuesChange={handleStatusValuesChange}
                options={STATUS_OPTIONS_MULTI}
              />
            ),
          },
          {
            id: "sourceChannel",
            label: "Channel",
            active: (appliedSourceChannels?.length ?? 0) > 0,
            control: (
              <BuildMultiFilterSelect
                label="Channel"
                values={appliedSourceChannels ?? []}
                onValuesChange={handleSourceChannelValuesChange}
                options={SOURCE_CHANNEL_OPTIONS_MULTI}
              />
            ),
          },
          {
            id: "theme",
            label: "Theme",
            active: (appliedThemes?.length ?? 0) > 0,
            control: (
              <BuildMultiFilterSelect
                label="Theme"
                values={appliedThemes ?? []}
                onValuesChange={handleThemeValuesChange}
                options={themeOptionsMulti}
              />
            ),
          },
          {
            id: "segment",
            label: "Segment",
            active: (appliedSegments?.length ?? 0) > 0,
            control: (
              <BuildMultiFilterSelect
                label="Segment"
                values={appliedSegments ?? []}
                onValuesChange={handleSegmentValuesChange}
                options={segmentOptionsMulti}
              />
            ),
          },
          {
            id: "customer",
            label: "Customer",
            active: (appliedCrmOrgIds?.length ?? 0) > 0,
            control: (
              <BuildMultiFilterSelect
                label="Customer"
                values={appliedCrmOrgIds ?? []}
                onValuesChange={handleCrmOrgValuesChange}
                options={customerOptionsMulti}
              />
            ),
          },
          {
            id: "sentiment",
            label: "Sentiment",
            active: (appliedSentiments?.length ?? 0) > 0,
            control: (
              <BuildMultiFilterSelect
                label="Sentiment"
                values={appliedSentiments ?? []}
                onValuesChange={handleSentimentValuesChange}
                options={SENTIMENT_OPTIONS_MULTI}
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
                value={consentStatusValue}
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
            active: (appliedAssigneeIds?.length ?? 0) > 0,
            control: (
              <BuildMultiFilterSelect
                label="Assignee"
                values={appliedAssigneeIds ?? []}
                onValuesChange={handleAssigneeValuesChange}
                options={memberOptions}
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
      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 px-0 pb-1">
          {chips.map((chip) => (
            <FilterChip
              key={chip.id}
              label={chip.label}
              value={chip.value}
              onRemove={chip.onRemove}
            />
          ))}
        </div>
      )}
    </div>
  );
}
