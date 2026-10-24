"use client";

import type { ReactNode } from "react";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import { BuildMultiFilterSelect } from "@/features/build/shared/build-multi-filter-select";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import type { BuildToolbarFilter } from "@/features/build/shared/build-list-toolbar-layout";

const SORT_OPTIONS = [
  { label: "By score", value: "score" },
  { label: "By updated", value: "updated" },
  { label: "By evidence", value: "evidence" },
];

const CONFIDENCE_OPTIONS = [
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
];

const STATE_OPTIONS = [
  { label: "Identified", value: "identified" },
  { label: "Validating", value: "validating" },
  { label: "Accepted", value: "accepted" },
  { label: "Declined", value: "declined" },
  { label: "Delivered", value: "delivered" },
  { label: "Measured", value: "measured" },
];

const EVIDENCE_AGE_OPTIONS = [
  { label: "Any age", value: "all" },
  { label: "Last 7 days", value: "7" },
  { label: "Last 30 days", value: "30" },
  { label: "Last 90 days", value: "90" },
];

const SCORE_MIN_OPTIONS = [
  { label: "Any score", value: "all" },
  { label: "≥ 10", value: "10" },
  { label: "≥ 25", value: "25" },
  { label: "≥ 50", value: "50" },
  { label: "≥ 100", value: "100" },
];

const SCORE_MAX_OPTIONS = [
  { label: "No max", value: "all" },
  { label: "≤ 25", value: "25" },
  { label: "≤ 50", value: "50" },
  { label: "≤ 100", value: "100" },
  { label: "≤ 250", value: "250" },
];

export interface OpportunitiesFilterBarProps {
  stateValues: string[];
  sortFilter: string;
  segmentValues: string[];
  ownerValues: string[];
  themeValues?: string[];
  confidenceValues: string[];
  evidenceAgeFilter: string;
  scoreMinFilter: string;
  scoreMaxFilter?: string;
  search?: string;
  segmentOptions: Array<{ label: string; value: string }>;
  ownerOptions: Array<{ label: string; value: string }>;
  ownerSearch?: string;
  onOwnerSearchChange?: (v: string) => void;
  themeOptions?: Array<{ label: string; value: string }>;
  onStateValuesChange: (values: string[]) => void;
  onSortChange: (v: string) => void;
  onSegmentValuesChange: (values: string[]) => void;
  onOwnerValuesChange: (values: string[]) => void;
  onThemeValuesChange?: (values: string[]) => void;
  onConfidenceValuesChange: (values: string[]) => void;
  onEvidenceAgeChange: (v: string) => void;
  onScoreMinChange: (v: string) => void;
  onScoreMaxChange?: (v: string) => void;
  onSearchChange?: (v: string) => void;
  onClearAll?: () => void;
  trailing?: ReactNode;
}

export function OpportunitiesFilterBar({
  stateValues,
  sortFilter,
  segmentValues,
  ownerValues,
  themeValues = [],
  confidenceValues,
  evidenceAgeFilter,
  scoreMinFilter,
  scoreMaxFilter = "all",
  search = "",
  segmentOptions,
  ownerOptions,
  ownerSearch,
  onOwnerSearchChange,
  themeOptions,
  onStateValuesChange,
  onSortChange,
  onSegmentValuesChange,
  onOwnerValuesChange,
  onThemeValuesChange,
  onConfidenceValuesChange,
  onEvidenceAgeChange,
  onScoreMinChange,
  onScoreMaxChange,
  onSearchChange,
  onClearAll,
  trailing,
}: OpportunitiesFilterBarProps) {
  const filters: BuildToolbarFilter[] = [
    {
      id: "oppState",
      label: "State",
      active: stateValues.length > 0,
      control: (
        <BuildMultiFilterSelect
          label="State"
          values={stateValues}
          onValuesChange={onStateValuesChange}
          options={STATE_OPTIONS}
        />
      ),
    },
    {
      id: "oppSort",
      label: "Sort",
      active: sortFilter !== "all" && sortFilter !== "",
      control: (
        <BuildFilterSelect
          label="Sort"
          value={sortFilter || "all"}
          onValueChange={onSortChange}
          options={[
            { label: "By score", value: "all" },
            ...SORT_OPTIONS.slice(1),
          ]}
        />
      ),
    },
  ];
  if (segmentOptions.length > 0) {
    filters.push({
      id: "oppSegment",
      label: "Segment",
      active: segmentValues.length > 0,
      control: (
        <BuildMultiFilterSelect
          label="Segment"
          values={segmentValues}
          onValuesChange={onSegmentValuesChange}
          options={segmentOptions}
        />
      ),
    });
  }
  if (ownerOptions.length > 0 || ownerSearch) {
    filters.push({
      id: "oppOwner",
      label: "Owner",
      active: ownerValues.length > 0,
      control: (
        <BuildMultiFilterSelect
          label="Owner"
          values={ownerValues}
          onValuesChange={onOwnerValuesChange}
          options={ownerOptions}
          searchValue={ownerSearch}
          onSearchChange={onOwnerSearchChange}
        />
      ),
    });
  }
  if (themeOptions && themeOptions.length > 0 && onThemeValuesChange) {
    filters.push({
      id: "oppTheme",
      label: "Theme",
      active: themeValues.length > 0,
      control: (
        <BuildMultiFilterSelect
          label="Theme"
          values={themeValues}
          onValuesChange={onThemeValuesChange}
          options={themeOptions}
        />
      ),
    });
  }
  filters.push(
    {
      id: "oppConfidence",
      label: "Confidence",
      active: confidenceValues.length > 0,
      control: (
        <BuildMultiFilterSelect
          label="Confidence"
          values={confidenceValues}
          onValuesChange={onConfidenceValuesChange}
          options={CONFIDENCE_OPTIONS}
        />
      ),
    },
    {
      id: "oppEvidenceAge",
      label: "Evidence age",
      active: evidenceAgeFilter !== "all",
      control: (
        <BuildFilterSelect
          label="Evidence age"
          value={evidenceAgeFilter}
          onValueChange={onEvidenceAgeChange}
          options={EVIDENCE_AGE_OPTIONS}
        />
      ),
    },
    {
      id: "oppScoreMin",
      label: "Min score",
      active: scoreMinFilter !== "all",
      control: (
        <BuildFilterSelect
          label="Min score"
          value={scoreMinFilter}
          onValueChange={onScoreMinChange}
          options={SCORE_MIN_OPTIONS}
        />
      ),
    },
  );
  if (onScoreMaxChange) {
    filters.push({
      id: "oppScoreMax",
      label: "Max score",
      active: scoreMaxFilter !== "all",
      control: (
        <BuildFilterSelect
          label="Max score"
          value={scoreMaxFilter}
          onValueChange={onScoreMaxChange}
          options={SCORE_MAX_OPTIONS}
        />
      ),
    });
  }

  return (
    <BuildListToolbar
      search={
        onSearchChange
          ? {
              value: search,
              onValueChange: onSearchChange,
              placeholder: "Search opportunities…",
              label: "Search opportunities",
            }
          : undefined
      }
      filters={filters}
      onClearAll={onClearAll}
      trailing={trailing}
      row={{ mobile: 2, tablet: 3, desktop: 4 }}
      className="[&>[data-slot=build-toolbar-actions]]:w-full [&>[data-slot=build-toolbar-actions]]:flex-1"
    />
  );
}
