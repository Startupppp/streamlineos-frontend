"use client";
import type { z } from "zod";
import type { entityContextResponseContract } from "@/hooks/api/payroll/entities-schema";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { payrollQueryKeys } from "@/lib/query-keys/payroll";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

const entityListC = lazyContract(() =>
  import("@/hooks/api/payroll/entities-schema").then((m) => m.payrollEntityListContract),
);
const entityC = lazyContract(() =>
  import("@/hooks/api/payroll/entities-schema").then((m) => m.payrollEntityContract),
);
const countryPacksC = lazyContract(() =>
  import("@/hooks/api/payroll/entities-schema").then((m) => m.countryPacksResponseContract),
);
const entityContextC = lazyContract(() =>
  import("@/hooks/api/payroll/entities-schema").then((m) => m.entityContextResponseContract),
);

export interface CountryPackDescriptor {
  countryCode: string;
  countryName: string;
  currency: string;
  maturity: "production_baseline" | "pilot" | "template";
  honestyLabel: string;
  payrollStatutoryBundle: string | null;
  holidayCount: number;
  complianceRequirementCount: number;
  sensitiveFieldCount: number;
}

export interface PayrollEntity {
  id: number;
  legalName: string;
  countryCode: string;
  stateCode: string | null;
  baseCurrency: string;
  pan: string | null;
  tan: string | null;
  pfEstablishmentCode: string | null;
  esiCode: string | null;
  ptStateCode: string | null;
  status: string;
}

export interface EntityReadinessItem {
  key: string;
  label: string;
  done: boolean;
  detail: string;
}

export type EntityContext = z.infer<typeof entityContextResponseContract>;

export function usePayrollEntities() {
  const canView = useCan("payroll:policies:view");
  return useQuery({
    queryKey: payrollQueryKeys.payroll.entitiesAll,
    queryFn: ({ signal }) => apiClient.get<PayrollEntity[]>("/payroll/entities", undefined, signal, entityListC),
    staleTime: 60_000,
    enabled: canView,
  });
}

export function useCountryPacks() {
  const canView = useCan("payroll:policies:view");
  return useQuery({
    queryKey: payrollQueryKeys.payroll.entityCountryPacks(),
    queryFn: ({ signal }) =>
      apiClient.get<{
        mode: string;
        honestyNote: string;
        packs: CountryPackDescriptor[];
      }>("/payroll/entities/country-packs", undefined, signal, countryPacksC),
    staleTime: 5 * 60_000,
    enabled: canView,
  });
}

export function useEntityContext(entityId: number | null) {
  const canView = useCan("payroll:policies:view");
  return useQuery({
    queryKey: payrollQueryKeys.payroll.entityContext(entityId ?? 0),
    queryFn: ({ signal }) =>
      apiClient.get<EntityContext>(`/payroll/entities/${entityId}/context`, undefined, signal, entityContextC),
    enabled: canView && entityId != null && entityId > 0,
    staleTime: 60_000,
  });
}

export type EntityFilingPatch = Partial<{
  legalName: string;
  pan: string | null;
  tan: string | null;
  pfEstablishmentCode: string | null;
  esiCode: string | null;
  ptStateCode: string | null;
  stateCode: string | null;
}>;

export function useUpdatePayrollEntity(entityId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("payroll:policies:manage", {
    mutationKey: ["payroll", "entities", entityId, "update"],
    mutationFn: (body: EntityFilingPatch) =>
      apiClient.patch(`/payroll/entities/${entityId}`, body, undefined, entityC),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.entitiesAll });
    },
  });
}
