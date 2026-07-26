"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useCan } from "@/hooks/api/access";

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

export interface EntityContext {
  entity: PayrollEntity;
  countryPack: CountryPackDescriptor | null;
  readiness: EntityReadinessItem[];
  readinessScore: { done: number; total: number; percent: number };
  isolation: { note: string };
  honestyNote: string;
}

export const entityKeys = {
  all: ["payroll", "entities"] as const,
  packs: ["payroll", "entities", "country-packs"] as const,
  context: (id: number) => ["payroll", "entities", id, "context"] as const,
};

export function usePayrollEntities() {
  const canView = useCan("payroll:policies:view");
  return useQuery({
    queryKey: entityKeys.all,
    queryFn: () => apiClient.get<PayrollEntity[]>("/payroll/entities"),
    staleTime: 60_000,
    enabled: canView,
  });
}

export function useCountryPacks() {
  const canView = useCan("payroll:policies:view");
  return useQuery({
    queryKey: entityKeys.packs,
    queryFn: () =>
      apiClient.get<{
        mode: string;
        honestyNote: string;
        packs: CountryPackDescriptor[];
      }>("/payroll/entities/country-packs"),
    staleTime: 5 * 60_000,
    enabled: canView,
  });
}

export function useEntityContext(entityId: number | null) {
  const canView = useCan("payroll:policies:view");
  return useQuery({
    queryKey: entityKeys.context(entityId ?? 0),
    queryFn: () =>
      apiClient.get<EntityContext>(`/payroll/entities/${entityId}/context`),
    enabled: canView && entityId != null && entityId > 0,
    staleTime: 60_000,
  });
}
