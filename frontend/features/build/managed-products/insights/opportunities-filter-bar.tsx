"use client";

import type { ReactNode } from "react";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import type { BuildToolbarFilter } from "@/features/build/shared/build-list-toolbar-layout";

const STATE_OPTIONS = [
  { label: "All states", value: "all" },
  { label: "Identified", value: "identified" },
  { label: "Validating", value: "validating" },
  { label: "Accepted", value: "accepted" },
  { label: "Declined", value: "declined" },
  { label: "Delivered", value: "delivered" },
  { label: "Measured", value: "measured" },
];

const SORT_OPTIONS = [
  { label: "By score", value: "score" },
  { label: "By updated", value: "updated" },
  { label: "By evidence", value: "evidence" },
];

const CONFIDENCE_OPTIONS = [
  { label: "Any confidence", value: "all" },
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
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

export interface OpportunitiesFilterBarProps {
  stateFilter: string;
  sortFilter: string;
  segmentFilter: string;
  ownerFilter: string;
  confidenceFilter: string;
  evidenceAgeFilter: string;
  scoreMinFilter: string;
  segmentOptions: Array<{ label: string; value: string }>;
  ownerOptions: Array<{ label: string; value: string }>;
  onStateChange: (v: string) => void;
  onSortChange: (v: string) => void;
  onSegmentChange: (v: string) => void;
  onOwnerChange: (v: string) => void;
  onConfidenceChange: (v: string) => void;
  onEvidenceAgeChange: (v: string) => void;
  onScoreMinChange: (v: string) => void;
  onClearAll?: () => void;
  trailing?: ReactNode;
}

export function OpportunitiesFilterBar({
  stateFilter,
  sortFilter,
  segmentFilter,
  ownerFilter,
  confidenceFilter,
  evidenceAgeFilter,
  scoreMinFilter,
  segmentOptions,
  ownerOptions,
  onStateChange,
  onSortChange,
  onSegmentChange,
  onOwnerChange,
  onConfidenceChange,
  onEvidenceAgeChange,
  onScoreMinChange,
  onClearAll,
  trailing,
}: OpportunitiesFilterBarProps) {
  const filters: BuildToolbarFilter[] = [
    {
      id: "oppState",
      label: "State",
      active: stateFilter !== "all",
      control: (
        <BuildFilterSelect
          label="State"
          value={stateFilter}
          onValueChange={onStateChange}
          options={STATE_OPTIONS}
        />
      ),
    },
    {
      id: "oppSort",
      label: "Sort",
      active: sortFilter !== "all",
      control: (
        <BuildFilterSelect
          label="Sort"
          value={sortFilter}
          onValueChange={onSortChange}
          options={SORT_OPTIONS}
        />
      ),
    },
  ];
  if (segmentOptions.length > 1) {
    filters.push({
      id: "oppSegment",
      label: "Segment",
      active: segmentFilter !== "all",
      control: (
        <BuildFilterSelect
          label="Segment"
          value={segmentFilter}
          onValueChange={onSegmentChange}
          options={segmentOptions}
        />
      ),
    });
  }
  if (ownerOptions.length > 1) {
    filters.push({
      id: "oppOwner",
      label: "Owner",
      active: ownerFilter !== "all",
      control: (
        <BuildFilterSelect
          label="Owner"
          value={ownerFilter}
          onValueChange={onOwnerChange}
          options={ownerOptions}
        />
      ),
    });
  }
  filters.push(
    {
      id: "oppConfidence",
      label: "Confidence",
      active: confidenceFilter !== "all",
      control: (
        <BuildFilterSelect
          label="Confidence"
          value={confidenceFilter}
          onValueChange={onConfidenceChange}
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

  return (
    <BuildListToolbar
      filters={filters}
      onClearAll={onClearAll}
      trailing={trailing}
      row={{ mobile: 2, tablet: 3, desktop: 4 }}
    />
  );
}
