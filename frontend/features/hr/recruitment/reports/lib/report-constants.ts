import type { ReportEntity } from "@/hooks/api";

export const ENTITY_OPTIONS: { value: ReportEntity; label: string }[] = [
  { value: "candidates", label: "Candidates" },
  { value: "jobs", label: "Job Postings" },
  { value: "interviews", label: "Interviews" },
  { value: "offers", label: "Offers" },
];
