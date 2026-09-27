import { BUILD_FILTER_ALL } from "@/features/build/shared/use-build-list-filters";

export const STATUS_OPTIONS = [
  { value: BUILD_FILTER_ALL, label: "All statuses" },
  { value: "open", label: "Open" },
  { value: "mitigating", label: "Mitigating" },
  { value: "monitoring", label: "Monitoring" },
  { value: "accepted", label: "Accepted" },
  { value: "closed", label: "Closed" },
];

export const PROBABILITY_OPTIONS = [
  { value: BUILD_FILTER_ALL, label: "All probabilities" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

export const IMPACT_OPTIONS = [
  { value: BUILD_FILTER_ALL, label: "All impacts" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

export const FILTER_DEFINITIONS = [
  {
    param: "status",
    options: STATUS_OPTIONS.map((o) => o.value),
  },
  {
    param: "probability",
    options: ["low", "medium", "high"] as const,
  },
  {
    param: "impact",
    options: ["low", "medium", "high"] as const,
  },
] as const;
