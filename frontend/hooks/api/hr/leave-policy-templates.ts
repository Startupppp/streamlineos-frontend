"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { useCan, useModuleEnabled } from "@/hooks/api/access";
import { LEAVE_TYPES_KEY } from "@/hooks/api/hr/leaves-query-identity";
import { useIdempotentOperation } from "@/hooks/common/use-idempotent-operation";
import type {
  LeavePolicyTemplateKey,
  LeavePolicyTemplateOffer,
} from "@/hooks/api/hr/leave-policy-templates-schema";

const offerContract = lazyContract(() =>
  import("@/hooks/api/hr/leave-policy-templates-schema").then(
    (m) => m.leavePolicyTemplateOfferContract,
  ),
);
const dismissContract = lazyContract(() =>
  import("@/hooks/api/hr/leave-policy-templates-schema").then(
    (m) => m.leavePolicyTemplateDismissContract,
  ),
);
const importContract = lazyContract(() =>
  import("@/hooks/api/hr/leave-policy-templates-schema").then(
    (m) => m.leavePolicyTemplateImportContract,
  ),
);

export interface LeavePolicyTemplateImportItem {
  key: LeavePolicyTemplateKey;
  leaveTypeName: string;
  policyName: string;
  daysPerYear: number;
  carryForward: boolean;
  accrualType: "ANNUAL" | "MONTHLY";
  accrualRate: string;
  maxBalance?: string;
  carryForwardDays: string;
  encashable: boolean;
  probationRestricted: boolean;
  effectiveFrom: string;
}

export function useLeavePolicyTemplateOffer() {
  const canManage = useCan("hr:leaves:manage");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery<LeavePolicyTemplateOffer>({
    queryKey: humanResourcesQueryKeys.hr.leavePolicyTemplates(),
    queryFn: ({ signal }) =>
      apiClient.get<LeavePolicyTemplateOffer>(
        "/hr/leave-policies/templates",
        undefined,
        signal,
        offerContract,
      ),
    staleTime: 5 * 60_000,
    enabled: hrEnabled && canManage,
  });
}

export function useDismissLeavePolicyTemplates() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:leaves:manage", {
    mutationKey: ["hr", "leave-policy-templates", "dismiss"],
    mutationFn: () =>
      apiClient.post<{ dismissedAt: string }>(
        "/hr/leave-policies/templates/dismiss",
        {},
        undefined,
        dismissContract,
      ),
    // The server's answer already is the new state, so the offer is patched
    // rather than refetched (FE-35) — the prompt closes and stays closed.
    onSuccess: (result) => {
      qc.setQueryData<LeavePolicyTemplateOffer>(
        humanResourcesQueryKeys.hr.leavePolicyTemplates(),
        (previous) =>
          previous
            ? { ...previous, dismissedAt: result.dismissedAt, shouldOffer: false }
            : previous,
      );
    },
  });
}

export function useImportLeavePolicyTemplates() {
  const qc = useQueryClient();
  const operation = useIdempotentOperation();
  return useAuthorizedMutation(
    "hr:leaves:manage",
    {
      mutationKey: ["hr", "leave-policy-templates", "import"],
      mutationFn: (items: LeavePolicyTemplateImportItem[]) =>
        apiClient.post<{ created: number; skipped: LeavePolicyTemplateKey[] }>(
          "/hr/leave-policies/templates/import",
          { items },
          operation.configFor(items),
          importContract,
        ),
      onSuccess: () => {
        // The import writes leave types and policies, and it is what makes the
        // offer stop applying — all three reads move together.
        qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.leavePolicies() });
        qc.invalidateQueries({ queryKey: LEAVE_TYPES_KEY });
        qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.leavePolicyTemplates() });
      },
      onSettled: operation.settle,
    },
  );
}
