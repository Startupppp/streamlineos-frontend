"use client";

import { useMemo } from "react";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import { BuildMultiFilterSelect } from "@/features/build/shared/build-multi-filter-select";
import { FilterChip } from "@/features/build/shared/filter-chip";
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
import { BUILD_FILTER_ALL } from "@/features/build/shared/use-build-list-filters";
import type { useProductFeedbackFilters } from "./use-product-feedback-filters";

const SOURCE_CHANNEL_OPTIONS_MULTI = SOURCE_CHANNEL_FILTER_OPTIONS.filter(
  (o) => o.value !== BUILD_FILTER_ALL,
);
const SENTIMENT_OPTIONS_MULTI = SENTIMENT_FILTER_OPTIONS.filter(
  (o) => o.value !== BUILD_FILTER_ALL,
);

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

interface ActiveChip {
  id: string;
  label: string;
  value: string;
  onRemove: () => void;
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
    consentStatusValue,
    typedFrom,
    typedTo,
    typedAssigneeId,
    appliedSourceChannels,
    appliedThemes,
    appliedSentiments,
    appliedSegments,
    appliedCrmOrgIds,
    appliedConsentStatus,
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
    handleDateRangeChange,
  } = filterState;

  const themeOptionsMulti = useMemo(() => {
    const opts = [
      { value: "untagged", label: "Untagged" },
      ...(facetsData?.themes ?? [])
        .filter((t): t is { value: string; count: number } => t.value !== null)
        .map((t) => ({ value: t.value, label: t.value })),
    ];
    for (const applied of appliedThemes ?? []) {
      if (applied !== "untagged" && !opts.some((o) => o.value === applied)) {
        opts.push({ value: applied, label: applied });
      }
    }
    return opts;
  }, [appliedThemes, facetsData?.themes]);

  const segmentOptionsMulti = useMemo(() => {
    const opts = [
      ...(facetsData?.segments ?? [])
        .filter((s): s is { value: string; count: number } => s.value !== null)
        .map((s) => ({ value: s.value, label: s.value })),
    ];
    for (const applied of appliedSegments ?? []) {
      if (!opts.some((o) => o.value === applied)) {
        opts.push({ value: applied, label: applied });
      }
    }
    return opts;
  }, [appliedSegments, facetsData?.segments]);

  const customerOptionsMulti = useMemo(() => {
    const opts = (crmOrgsData?.organizations ?? []).map((o) => ({
      value: String(o.id),
      label: o.name,
    }));
    for (const applied of appliedCrmOrgIds ?? []) {
      if (!opts.some((o) => o.value === applied)) {
        opts.push({ value: applied, label: `Customer ${applied}` });
      }
    }
    return opts;
  }, [appliedCrmOrgIds, crmOrgsData?.organizations]);

  const chips = useMemo((): ActiveChip[] => {
    const result: ActiveChip[] = [];
    for (const ch of appliedSourceChannels ?? []) {
      const label = SOURCE_CHANNEL_OPTIONS_MULTI.find((o) => o.value === ch)?.label ?? ch;
      result.push({
        id: `channel:${ch}`,
        label: "Channel",
        value: label,
        onRemove: () => handleSourceChannelValuesChange((appliedSourceChannels ?? []).filter((v) => v !== ch)),
      });
    }
    for (const th of appliedThemes ?? []) {
      result.push({
        id: `theme:${th}`,
        label: "Theme",
        value: th,
        onRemove: () => handleThemeValuesChange((appliedThemes ?? []).filter((v) => v !== th)),
      });
    }
    for (const se of appliedSentiments ?? []) {
      const label = SENTIMENT_OPTIONS_MULTI.find((o) => o.value === se)?.label ?? se;
      result.push({
        id: `sentiment:${se}`,
        label: "Sentiment",
        value: label,
        onRemove: () => handleSentimentValuesChange((appliedSentiments ?? []).filter((v) => v !== se)),
      });
    }
    for (const sg of appliedSegments ?? []) {
      result.push({
        id: `segment:${sg}`,
        label: "Segment",
        value: sg,
        onRemove: () => handleSegmentValuesChange((appliedSegments ?? []).filter((v) => v !== sg)),
      });
    }
    for (const cid of appliedCrmOrgIds ?? []) {
      const label = customerOptionsMulti.find((o) => o.value === cid)?.label ?? `Customer ${cid}`;
      result.push({
        id: `customer:${cid}`,
        label: "Customer",
        value: label,
        onRemove: () => handleCrmOrgValuesChange((appliedCrmOrgIds ?? []).filter((v) => v !== cid)),
      });
    }
    return result;
  }, [
    appliedSourceChannels,
    appliedThemes,
    appliedSentiments,
    appliedSegments,
    appliedCrmOrgIds,
    customerOptionsMulti,
    handleSourceChannelValuesChange,
    handleThemeValuesChange,
    handleSentimentValuesChange,
    handleSegmentValuesChange,
    handleCrmOrgValuesChange,
  ]);

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
