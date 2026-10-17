import type { ReportingManagerPolicy } from "@/hooks/api/hr/reporting-lines-schema";

type Policy = Pick<
  ReportingManagerPolicy,
  "defaultPrimaryManager" | "defaultPrimaryManagerEligible" | "fallbackOrder" | "actorQualifiesAsFallback"
>;

/**
 * Who a blank primary resolves to under this policy when that is the org's
 * configured default: it is tried first, or the uploader does not qualify
 * (mirrors the backend's fallback resolver). When the uploader would be picked
 * instead, this returns null and the server has the last word.
 */
export interface AssignedDefault {
  userId: string;
  name: string;
  email: string | null;
}

export function policyAssignedDefault(policy: Policy | null | undefined): AssignedDefault | null {
  const manager = policy?.defaultPrimaryManager;
  if (!policy || !manager || !policy.defaultPrimaryManagerEligible) return null;
  const configuredFirst = policy.fallbackOrder === "CONFIGURED_MANAGER_THEN_UPLOADER";
  return configuredFirst || !policy.actorQualifiesAsFallback ? { userId: manager.userId, name: manager.name, email: manager.email } : null;
}
