import "server-only";

import type { z } from "zod";

import { dehydrate } from "@tanstack/react-query";
import { createServerQueryClient } from "./server-query-client";
import { resolvePrefetchGate } from "./prefetch-gate";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { directoryAndOwnershipQueryKeys } from "@/lib/query-keys/directory-and-ownership";
import { employeeSupportQueryKeys } from "@/lib/query-keys/employee-support";
import { serverGet } from "@/lib/server-fetch";
import { hrDocumentListContract } from "@/lib/prefetch/prefetch-schema";
import { assetListPageContract } from "@/hooks/api/hr/assets-schema";
import { expensePageDataContract } from "@/hooks/api/hr/expenses-schema";
import { reimbursementsListContract } from "@/hooks/api/hr/reimbursements-schema";
import { travelRequestListContract } from "@/hooks/api/hr/travel-schema";
import { hrCaseListContract } from "@/hooks/api/hr/cases-schema";
import { safetyIncidentListContract } from "@/hooks/api/hr/safety-schema";
import { helpdeskTicketListContract } from "@/hooks/api/hr/helpdesk-schema";
import { opsInboxContract, myItemsContract } from "@/hooks/api/hr/service-delivery-schema";
import { assetReturnListContract } from "@/hooks/api/hr/asset-returns-schema";

type HrDocumentListResponse = z.infer<typeof hrDocumentListContract>;
type HrAssetListResponse = z.infer<typeof assetListPageContract>;
type ExpensePageDataResponse = z.infer<typeof expensePageDataContract>;
type ReimbursementsListResponse = z.infer<typeof reimbursementsListContract>;
type TravelListResponse = z.infer<typeof travelRequestListContract>;
type HrCaseListResponse = z.infer<typeof hrCaseListContract>;
type SafetyIncidentListResponse = z.infer<typeof safetyIncidentListContract>;
type HelpdeskTicketListResponse = z.infer<typeof helpdeskTicketListContract>;
type OpsInboxResponse = z.infer<typeof opsInboxContract>;
type MyItemsResponse = z.infer<typeof myItemsContract>;
type AssetReturnListResponse = z.infer<typeof assetReturnListContract>;

export async function prefetchHrDocuments() {
  const queryClient = await createServerQueryClient();
  await queryClient.prefetchQuery({
    queryKey: humanResourcesQueryKeys.hr.documents({ limit: 20 }),
    queryFn: () => serverGet<HrDocumentListResponse>("/hr/documents?limit=20", hrDocumentListContract),
    staleTime: 60_000,
  });
  return dehydrate(queryClient);
}

export async function prefetchHrAssets() {
  const queryClient = await createServerQueryClient();
  await queryClient.prefetchQuery({
    queryKey: humanResourcesQueryKeys.hr.assets({ limit: 20 }),
    queryFn: () => serverGet<HrAssetListResponse>("/hr/assets?limit=20", assetListPageContract),
    staleTime: 60_000,
  });
  return dehydrate(queryClient);
}

export async function prefetchHrExpenses() {
  const queryClient = await createServerQueryClient();
  await queryClient.prefetchQuery({
    queryKey: [...humanResourcesQueryKeys.hr.expenses(), "pageData", "org", {}] as const,
    queryFn: () => serverGet<ExpensePageDataResponse>("/hr/expenses/page-data", expensePageDataContract),
    staleTime: 30_000,
  });
  return dehydrate(queryClient);
}

export async function prefetchHrReimbursements() {
  const queryClient = await createServerQueryClient();
  await queryClient.prefetchQuery({
    queryKey: [...humanResourcesQueryKeys.hr.all, "reimbursements", "list"] as const,
    queryFn: () => serverGet<ReimbursementsListResponse>("/hr/reimbursements", reimbursementsListContract),
    staleTime: 2 * 60_000,
  });
  return dehydrate(queryClient);
}

export async function prefetchHrTravel() {
  const queryClient = await createServerQueryClient();
  await queryClient.prefetchQuery({
    queryKey: humanResourcesQueryKeys.hr.travelMine(),
    queryFn: () => serverGet<TravelListResponse>("/hr/travel", travelRequestListContract),
    staleTime: 60_000,
  });
  return dehydrate(queryClient);
}

export async function prefetchHrTravelApprovals() {
  const queryClient = await createServerQueryClient();
  await queryClient.prefetchQuery({
    queryKey: humanResourcesQueryKeys.hr.travelApprovals(),
    queryFn: () => serverGet<TravelListResponse>("/hr/travel/approvals", travelRequestListContract),
    staleTime: 30_000,
  });
  return dehydrate(queryClient);
}

export async function prefetchHrCases() {
  const queryClient = await createServerQueryClient();
  await queryClient.prefetchQuery({
    queryKey: ["streamlineos", "hr", "cases", "list", {}] as const,
    queryFn: () => serverGet<HrCaseListResponse>("/hr/cases", hrCaseListContract),
    staleTime: 30_000,
  });
  return dehydrate(queryClient);
}

export async function prefetchHrSafety() {
  const queryClient = await createServerQueryClient();
  await queryClient.prefetchQuery({
    queryKey: directoryAndOwnershipQueryKeys.hrSafety.incidents({}),
    queryFn: () => serverGet<SafetyIncidentListResponse>("/hr/safety/incidents", safetyIncidentListContract),
    staleTime: 30_000,
  });
  return dehydrate(queryClient);
}

export async function prefetchHrHelpdesk() {
  const queryClient = await createServerQueryClient();
  await queryClient.prefetchQuery({
    queryKey: employeeSupportQueryKeys.employeeSupport.queueList({}),
    queryFn: () => serverGet<HelpdeskTicketListResponse>("/hr/helpdesk", helpdeskTicketListContract),
    staleTime: 15_000,
  });
  return dehydrate(queryClient);
}

export async function prefetchHrServiceDelivery() {
  const gate = await resolvePrefetchGate();
  const queryClient = await createServerQueryClient();
  await Promise.all([
    gate.can("hr:cases:view")
      ? queryClient.prefetchQuery({
          queryKey: ["hr", "service-delivery", "ops-inbox"] as const,
          queryFn: () => serverGet<OpsInboxResponse>("/hr/service-delivery/ops-inbox", opsInboxContract),
          staleTime: 30_000,
        })
      : Promise.resolve(),
    gate.can("hr:helpdesk:view")
      ? queryClient.prefetchQuery({
          queryKey: ["hr", "service-delivery", "my-items"] as const,
          queryFn: () => serverGet<MyItemsResponse>("/hr/service-delivery/my-items", myItemsContract),
          staleTime: 30_000,
        })
      : Promise.resolve(),
  ]);
  return dehydrate(queryClient);
}

export async function prefetchHrAssetReturns() {
  const queryClient = await createServerQueryClient();
  await queryClient.prefetchQuery({
    queryKey: humanResourcesQueryKeys.hr.assetReturnsList(),
    queryFn: () => serverGet<AssetReturnListResponse>("/hr/asset-returns", assetReturnListContract),
    staleTime: 60_000,
  });
  return dehydrate(queryClient);
}
