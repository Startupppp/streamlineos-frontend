import "server-only";

import type { z } from "zod";

import { dehydrate } from "@tanstack/react-query";
import { createServerQueryClient } from "./server-query-client";
import { resolvePrefetchGate } from "@/lib/prefetch/prefetch-gate";
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
import { accommodationsListQueryOptions } from "@/hooks/api/hr/enterprise-ops-accommodations-read-options";
import { emergencyEventsListQueryOptions } from "@/hooks/api/hr/enterprise-ops-emergency-read-options";
import { hrEventsListQueryOptions } from "@/hooks/api/hr/enterprise-ops-event-stream-read-options";
import { accessProvisioningQueryOptions } from "@/hooks/api/hr/enterprise-ops-identity-read-options";
import { simulationHistoryQueryOptions } from "@/hooks/api/hr/enterprise-ops-simulator-read-options";
import { complianceRequirementsQueryOptions, contractsQueryOptions } from "@/hooks/api/hr/global-read-options";
import { unionMembershipsListQueryOptions } from "@/features/hr/governance/hooks/use-labor-read-options";
import { legalHoldsListQueryOptions } from "@/features/hr/governance/hooks/use-legal-holds-read-options";

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
  try {
    const [queryClient, gate] = await Promise.all([
      createServerQueryClient(),
      resolvePrefetchGate(),
    ]);
    if (!gate.can("hr:accommodations:view")) return dehydrate(queryClient);
    await queryClient.prefetchQuery({
      ...accommodationsListQueryOptions(),
      queryFn: () => serverGet<AccommodationsListResponse>("/hr/enterprise/ops/accommodations", listAccommodationsContract),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchHrCompliance() {
  try {
    const [queryClient, gate] = await Promise.all([
      createServerQueryClient(),
      resolvePrefetchGate(),
    ]);
    if (!gate.can("hr:compliance:manage")) return dehydrate(queryClient);
    await queryClient.prefetchQuery({
      ...complianceRequirementsQueryOptions(),
      queryFn: () => serverGet<ComplianceRequirementsResponse>("/hr/global/compliance/requirements", listComplianceRequirementsContract),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchHrContingent() {
  try {
    const [queryClient, gate] = await Promise.all([
      createServerQueryClient(),
      resolvePrefetchGate(),
    ]);
    if (!gate.can("hr:contracts:view")) return dehydrate(queryClient);
    await queryClient.prefetchQuery({
      ...contractsQueryOptions(),
      queryFn: () => serverGet<ContractsListResponse>("/hr/global/contracts", listContractsContract),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchHrEmergency() {
  try {
    const [queryClient, gate] = await Promise.all([
      createServerQueryClient(),
      resolvePrefetchGate(),
    ]);
    if (!gate.can("hr:emergency:manage")) return dehydrate(queryClient);
    await queryClient.prefetchQuery({
      ...emergencyEventsListQueryOptions(),
      queryFn: () => serverGet<EmergencyEventsResponse>("/hr/enterprise/ops/emergency/events", listEmergencyEventsContract),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchHrEventStream() {
  try {
    const [queryClient, gate] = await Promise.all([
      createServerQueryClient(),
      resolvePrefetchGate(),
    ]);
    if (!gate.can("hr:eventstream:view")) return dehydrate(queryClient);
    await queryClient.prefetchQuery({
      ...hrEventsListQueryOptions(),
      queryFn: () => serverGet<HrEventsResponse>("/hr/enterprise/ops/event-stream/events", listHrEventsContract),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchHrLaborRelations() {
  try {
    const [queryClient, gate] = await Promise.all([
      createServerQueryClient(),
      resolvePrefetchGate(),
    ]);
    if (!gate.can("hr:labor:view")) return dehydrate(queryClient);
    await queryClient.prefetchQuery({
      ...unionMembershipsListQueryOptions(),
      queryFn: () => serverGet<UnionMembershipListResponse>("/hr/governance/labor/memberships", unionMembershipListContract),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchHrLegalHolds() {
  try {
    const [queryClient, gate] = await Promise.all([
      createServerQueryClient(),
      resolvePrefetchGate(),
    ]);
    if (!gate.can("hr:legalhold:view")) return dehydrate(queryClient);
    await queryClient.prefetchQuery({
      ...legalHoldsListQueryOptions(),
      queryFn: () => serverGet<LegalHoldListResponse>("/hr/governance/legal-holds", legalHoldListContract),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchHrSimulator() {
  try {
    const [queryClient, gate] = await Promise.all([
      createServerQueryClient(),
      resolvePrefetchGate(),
    ]);
    if (!gate.can("hr:policies:manage")) return dehydrate(queryClient);
    await queryClient.prefetchQuery({
      ...simulationHistoryQueryOptions(),
      queryFn: () => serverGet<SimulationsListResponse>("/hr/enterprise/ops/simulator/history", listSimulationsContract),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchHrIdentity() {
  try {
    const [queryClient, gate] = await Promise.all([
      createServerQueryClient(),
      resolvePrefetchGate(),
    ]);
    if (!gate.can("hr:identity:view")) return dehydrate(queryClient);
    await queryClient.prefetchQuery({
      ...accessProvisioningQueryOptions(),
      queryFn: () => serverGet<ProvisioningListResponse>("/hr/enterprise/ops/identity/provisioning", listProvisioningContract),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}
