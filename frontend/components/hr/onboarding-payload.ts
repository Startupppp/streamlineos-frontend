import { titleCaseLabel } from "@/lib/title-case";

/**
 * Build the onboarding mutation payload from the wizard's form values.
 *
 * A person's name is passed through verbatim (HRMS-E2E-027). The designation is
 * a job title the product normalises, so it goes through `titleCaseLabel`.
 */
export function buildOnboardEmployeePayload<T extends { designation: string }>(data: T): T {
  return { ...data, designation: titleCaseLabel(data.designation) };
}
