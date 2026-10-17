import { titleCaseLabel } from "@/lib/title-case";

interface ReportingFields {
  designation: string;
  reportingManagerUserId?: string;
  reportingManagerRef?: unknown;
  policyDefaultPrimary?: unknown;
  topLevelRole?: boolean;
  topLevelRoleReason?: string;
  secondaryManagers?: Array<{ managerUserId: string; label?: string; managerRef?: unknown }>;
}

type Payload<T> = Omit<Omit<T, DisplayOnly>, "secondaryManagers" | "reportingManagerUserId"> & {
  reportingManagerUserId?: string;
  secondaryManagers?: Array<{ managerUserId: string; label?: string }>;
};

type DisplayOnly = "reportingManagerRef" | "policyDefaultPrimary";

function withoutDisplayRef<T extends { reportingManagerRef?: unknown; policyDefaultPrimary?: unknown }>(value: T): Omit<T, DisplayOnly> {
  const copy = { ...value };
  delete copy.reportingManagerRef;
  delete copy.policyDefaultPrimary;
  return copy;
}

/**
 * Build the onboarding mutation payload from the wizard's form values.
 *
 * A person's name is passed through verbatim (HRMS-E2E-027). The designation is
 * a job title the product normalises, so it goes through `titleCaseLabel`.
 *
 * HRM-15: a blank primary manager is omitted so the backend resolves it by
 * policy; a top-level role sends no manager at all; the display-only manager
 * refs the form keeps for naming (and the policy default it validates
 * against) never leave the browser.
 */
export function buildOnboardEmployeePayload<T extends ReportingFields>(data: T): Payload<T> {
  const { secondaryManagers, reportingManagerUserId, ...rest } = withoutDisplayRef(data);
  const topLevel = data.topLevelRole === true;
  const secondaries = topLevel
    ? []
    : (secondaryManagers ?? [])
        .filter((entry) => entry.managerUserId)
        .map((entry) => ({
          managerUserId: entry.managerUserId,
          ...(entry.label?.trim() ? { label: entry.label.trim() } : {}),
        }));
  return {
    ...rest,
    designation: titleCaseLabel(data.designation),
    ...(!topLevel && reportingManagerUserId ? { reportingManagerUserId } : {}),
    ...(secondaries.length > 0 ? { secondaryManagers: secondaries } : {}),
  };
}
