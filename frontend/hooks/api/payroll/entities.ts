"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
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

export function usePayrollEntities() {
  const canView = useCan("payroll:policies:view");
  return useQuery({
    queryKey: queryKeys.payroll.entitiesAll,
    queryFn: () => apiClient.get<PayrollEntity[]>("/payroll/entities"),
    staleTime: 60_000,
    enabled: canView,
  });
}

export function useCountryPacks() {
  const canView = useCan("payroll:policies:view");
  return useQuery({
    queryKey: queryKeys.payroll.entityCountryPacks(),
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
    queryKey: queryKeys.payroll.entityContext(entityId ?? 0),
    queryFn: () =>
      apiClient.get<EntityContext>(`/payroll/entities/${entityId}/context`),
    enabled: canView && entityId != null && entityId > 0,
    staleTime: 60_000,
  });
}
