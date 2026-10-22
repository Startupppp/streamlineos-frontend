import { queryKeyBase } from "@/lib/query-keys/base";
import type { ProvisioningTrigger, ProvisioningStatus } from "./enterprise-ops-identity";

export const identityKeys = {
  all: [...queryKeyBase, "hr-identity"] as const,
  provisioning: (p: Record<string, unknown>) => [...queryKeyBase, "hr-identity", "provisioning", p] as const,
  templates: [...queryKeyBase, "hr-identity", "templates"] as const,
  exitVerification: (userId: string) => [...queryKeyBase, "hr-identity", "exit-verification", userId] as const,
};

export function accessProvisioningQueryOptions(params: {
  cursor?: string;
  userId?: string;
  triggeredBy?: ProvisioningTrigger;
  status?: ProvisioningStatus;
} = {}) {
  return {
    queryKey: identityKeys.provisioning(params),
    staleTime: 30_000,
  };
}
