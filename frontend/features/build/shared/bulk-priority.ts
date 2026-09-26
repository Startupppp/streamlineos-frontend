export type BulkPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

const BULK_PRIORITIES: readonly BulkPriority[] = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "URGENT",
];

export function toBulkPriority(value: string): BulkPriority | undefined {
  return BULK_PRIORITIES.find((priority) => priority === value);
}
