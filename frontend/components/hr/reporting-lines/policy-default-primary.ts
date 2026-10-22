import type { ReportingManagerPolicy } from "@/hooks/api/hr/reporting-lines-schema";

type Policy = Pick<
  ReportingManagerPolicy,
  "defaultPrimaryManager" | "defaultPrimaryManagerEligible" | "fallbackOrder" | "actorQualifiesAsFallback"
>;

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
