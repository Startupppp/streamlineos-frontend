"use client";

import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";

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
}: OpportunitiesFilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <BuildFilterSelect
        label="State"
        value={stateFilter}
        onValueChange={onStateChange}
        options={STATE_OPTIONS}
      />
      <BuildFilterSelect
        label="Sort"
        value={sortFilter}
        onValueChange={onSortChange}
        options={SORT_OPTIONS}
      />
      {segmentOptions.length > 1 && (
        <BuildFilterSelect
          label="Segment"
          value={segmentFilter}
          onValueChange={onSegmentChange}
          options={segmentOptions}
        />
      )}
      {ownerOptions.length > 1 && (
        <BuildFilterSelect
          label="Owner"
          value={ownerFilter}
          onValueChange={onOwnerChange}
          options={ownerOptions}
        />
      )}
      <BuildFilterSelect
        label="Confidence"
        value={confidenceFilter}
        onValueChange={onConfidenceChange}
        options={CONFIDENCE_OPTIONS}
      />
      <BuildFilterSelect
        label="Evidence age"
        value={evidenceAgeFilter}
        onValueChange={onEvidenceAgeChange}
        options={EVIDENCE_AGE_OPTIONS}
      />
      <BuildFilterSelect
        label="Min score"
        value={scoreMinFilter}
        onValueChange={onScoreMinChange}
        options={SCORE_MIN_OPTIONS}
      />
    </div>
  );
}
