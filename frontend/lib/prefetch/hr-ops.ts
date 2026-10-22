import "server-only";

import type { z } from "zod";

import { dehydrate } from "@tanstack/react-query";
import { createServerQueryClient } from "./server-query-client";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { directoryAndOwnershipQueryKeys } from "@/lib/query-keys/directory-and-ownership";
import { serverGet } from "@/lib/server-fetch";
import {
  listAccommodationsContract,
  listEmergencyEventsContract,
  listHrEventsContract,
  listSimulationsContract,
  listProvisioningContract,
} from "@/hooks/api/hr/enterprise-ops-schema";
import { listComplianceRequirementsContract, listContractsContract } from "@/hooks/api/hr/global-schema";
import { unionMembershipListContract } from "@/features/hr/governance/hooks/labor-schema";
import { legalHoldListContract } from "@/features/hr/governance/hooks/legal-holds-schema";
import { accommodationsListQueryOptions } from "@/hooks/api/hr/enterprise-ops-accommodations";
import { emergencyEventsListQueryOptions } from "@/hooks/api/hr/enterprise-ops-emergency";
import { hrEventsListQueryOptions } from "@/hooks/api/hr/enterprise-ops-event-stream";
import { accessProvisioningQueryOptions } from "@/hooks/api/hr/enterprise-ops-identity";
import { unionMembershipsListQueryOptions } from "@/features/hr/governance/hooks/use-labor";
import { legalHoldsListQueryOptions } from "@/features/hr/governance/hooks/use-legal-holds";

type AccommodationsListResponse = z.infer<typeof listAccommodationsContract>;
type ComplianceRequirementsResponse = z.infer<typeof listComplianceRequirementsContract>;
type ContractsListResponse = z.infer<typeof listContractsContract>;
type EmergencyEventsResponse = z.infer<typeof listEmergencyEventsContract>;
type HrEventsResponse = z.infer<typeof listHrEventsContract>;
type UnionMembershipListResponse = z.infer<typeof unionMembershipListContract>;
type LegalHoldListResponse = z.infer<typeof legalHoldListContract>;
type SimulationsListResponse = z.infer<typeof listSimulationsContract>;
type ProvisioningListResponse = z.infer<typeof listProvisioningContract>;

export async function prefetchHrAccommodations() {
  const queryClient = await createServerQueryClient();
  await queryClient.prefetchQuery({
    ...accommodationsListQueryOptions(),
    queryFn: () => serverGet<AccommodationsListResponse>("/hr/enterprise/ops/accommodations", listAccommodationsContract),
  });
  return dehydrate(queryClient);
}

export async function prefetchHrCompliance() {
  const queryClient = await createServerQueryClient();
  await queryClient.prefetchQuery({
    queryKey: humanResourcesQueryKeys.hr.complianceRequirements(),
    queryFn: () => serverGet<ComplianceRequirementsResponse>("/hr/global/compliance/requirements", listComplianceRequirementsContract),
    staleTime: 30_000,
  });
  return dehydrate(queryClient);
}

export async function prefetchHrContingent() {
  const queryClient = await createServerQueryClient();
  await queryClient.prefetchQuery({
    queryKey: humanResourcesQueryKeys.hr.contracts(),
    queryFn: () => serverGet<ContractsListResponse>("/hr/global/contracts", listContractsContract),
    staleTime: 30_000,
  });
  return dehydrate(queryClient);
}

export async function prefetchHrEmergency() {
  const queryClient = await createServerQueryClient();
  await queryClient.prefetchQuery({
    ...emergencyEventsListQueryOptions(),
    queryFn: () => serverGet<EmergencyEventsResponse>("/hr/enterprise/ops/emergency/events", listEmergencyEventsContract),
  });
  return dehydrate(queryClient);
}

export async function prefetchHrEventStream() {
  const queryClient = await createServerQueryClient();
  await queryClient.prefetchQuery({
    ...hrEventsListQueryOptions(),
    queryFn: () => serverGet<HrEventsResponse>("/hr/enterprise/ops/event-stream/events", listHrEventsContract),
  });
  return dehydrate(queryClient);
}

export async function prefetchHrLaborRelations() {
  const queryClient = await createServerQueryClient();
  await queryClient.prefetchQuery({
    ...unionMembershipsListQueryOptions(),
    queryFn: () => serverGet<UnionMembershipListResponse>("/hr/governance/labor/memberships", unionMembershipListContract),
  });
  return dehydrate(queryClient);
}

export async function prefetchHrLegalHolds() {
  const queryClient = await createServerQueryClient();
  await queryClient.prefetchQuery({
    ...legalHoldsListQueryOptions(),
    queryFn: () => serverGet<LegalHoldListResponse>("/hr/governance/legal-holds", legalHoldListContract),
  });
  return dehydrate(queryClient);
}

export async function prefetchHrSimulator() {
  const queryClient = await createServerQueryClient();
  await queryClient.prefetchQuery({
    queryKey: directoryAndOwnershipQueryKeys.hrSimulations.history({}),
    queryFn: () => serverGet<SimulationsListResponse>("/hr/enterprise/ops/simulator/history", listSimulationsContract),
    staleTime: 30_000,
  });
  return dehydrate(queryClient);
}

export async function prefetchHrIdentity() {
  const queryClient = await createServerQueryClient();
  await queryClient.prefetchQuery({
    ...accessProvisioningQueryOptions(),
    queryFn: () => serverGet<ProvisioningListResponse>("/hr/enterprise/ops/identity/provisioning", listProvisioningContract),
  });
  return dehydrate(queryClient);
}
