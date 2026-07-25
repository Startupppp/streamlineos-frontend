import type { ReportEntity } from "@/hooks/api";

export const HR_ROLES = ["CEO", "HR", "ADMIN", "HR_MANAGER", "OWNER"];

export const ENTITY_OPTIONS: { value: ReportEntity; label: string }[] = [
  { value: "candidates", label: "Candidates" },
  { value: "jobs", label: "Job Postings" },
  { value: "interviews", label: "Interviews" },
  { value: "offers", label: "Offers" },
];
