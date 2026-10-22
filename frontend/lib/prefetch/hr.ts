import "server-only";

import type { z } from "zod";

import { dehydrate } from "@tanstack/react-query";
import { createServerQueryClient } from "./server-query-client";
import { resolvePrefetchGate } from "./prefetch-gate";
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
import { expensePageDataQueryOptions } from "@/hooks/api/hr/expenses-read-options";
import { reimbursementsListQueryOptions } from "@/hooks/api/hr/reimbursements-read-options";
import { hrCasesListQueryOptions } from "@/hooks/api/hr/cases-read-options";
import { hrDocumentListQueryOptions } from "@/hooks/api/hr/documents-read-options";
import { hrAssetListQueryOptions } from "@/hooks/api/hr/assets-read-options";
import { travelMineQueryOptions, travelApprovalsQueryOptions } from "@/hooks/api/hr/travel-read-options";
import { safetyIncidentsQueryOptions } from "@/hooks/api/hr/safety-read-options";
import { helpdeskQueueListQueryOptions } from "@/hooks/api/hr/helpdesk-read-options";
import { serviceDeliveryOpsInboxQueryOptions, serviceDeliveryMyItemsQueryOptions } from "@/hooks/api/hr/service-delivery-read-options";
import { assetReturnsQueryOptions } from "@/hooks/api/hr/asset-returns-read-options";

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
    ...hrDocumentListQueryOptions(),
    queryFn: () => serverGet<HrDocumentListResponse>("/hr/documents?limit=20", hrDocumentListContract),
  });
  return dehydrate(queryClient);
}

export async function prefetchHrAssets() {
  const queryClient = await createServerQueryClient();
  await queryClient.prefetchQuery({
    ...hrAssetListQueryOptions(),
    queryFn: () => serverGet<HrAssetListResponse>("/hr/assets?limit=20", assetListPageContract),
  });
  return dehydrate(queryClient);
}

export async function prefetchHrExpenses() {
  const gate = await resolvePrefetchGate();
  const queryClient = await createServerQueryClient();
  if (gate.can("hr:expenses:view")) {
    await queryClient.prefetchQuery({
      ...expensePageDataQueryOptions({}, false),
      queryFn: () => serverGet<ExpensePageDataResponse>("/hr/expenses/page-data", expensePageDataContract),
    });
  }
  return dehydrate(queryClient);
}

export async function prefetchHrReimbursements() {
  const queryClient = await createServerQueryClient();
  await queryClient.prefetchQuery({
    ...reimbursementsListQueryOptions(),
    queryFn: async () => {
      const page = await serverGet<ReimbursementsListResponse>("/hr/reimbursements", reimbursementsListContract);
      return page.items;
    },
  });
  return dehydrate(queryClient);
}

export async function prefetchHrTravel() {
  const queryClient = await createServerQueryClient();
  await queryClient.prefetchQuery({
    ...travelMineQueryOptions(),
    queryFn: () => serverGet<TravelListResponse>("/hr/travel", travelRequestListContract),
  });
  return dehydrate(queryClient);
}

export async function prefetchHrTravelApprovals() {
  const queryClient = await createServerQueryClient();
  await queryClient.prefetchQuery({
    ...travelApprovalsQueryOptions(),
    queryFn: () => serverGet<TravelListResponse>("/hr/travel/approvals", travelRequestListContract),
  });
  return dehydrate(queryClient);
}

export async function prefetchHrCases() {
  const queryClient = await createServerQueryClient();
  await queryClient.prefetchQuery({
    ...hrCasesListQueryOptions(),
    queryFn: () => serverGet<HrCaseListResponse>("/hr/cases", hrCaseListContract),
  });
  return dehydrate(queryClient);
}

export async function prefetchHrSafety() {
  const queryClient = await createServerQueryClient();
  await queryClient.prefetchQuery({
    ...safetyIncidentsQueryOptions(),
    queryFn: () => serverGet<SafetyIncidentListResponse>("/hr/safety/incidents", safetyIncidentListContract),
  });
  return dehydrate(queryClient);
}

export async function prefetchHrHelpdesk() {
  const queryClient = await createServerQueryClient();
  await queryClient.prefetchQuery({
    ...helpdeskQueueListQueryOptions({}),
    queryFn: () => serverGet<HelpdeskTicketListResponse>("/hr/helpdesk", helpdeskTicketListContract),
  });
  return dehydrate(queryClient);
}

export async function prefetchHrServiceDelivery() {
  const gate = await resolvePrefetchGate();
  const queryClient = await createServerQueryClient();
  await Promise.all([
    gate.can("hr:cases:view")
      ? queryClient.prefetchQuery({
          ...serviceDeliveryOpsInboxQueryOptions(),
          queryFn: () => serverGet<OpsInboxResponse>("/hr/service-delivery/ops-inbox", opsInboxContract),
        })
      : Promise.resolve(),
    gate.can("hr:helpdesk:view")
      ? queryClient.prefetchQuery({
          ...serviceDeliveryMyItemsQueryOptions(),
          queryFn: () => serverGet<MyItemsResponse>("/hr/service-delivery/my-items", myItemsContract),
        })
      : Promise.resolve(),
  ]);
  return dehydrate(queryClient);
}

export async function prefetchHrAssetReturns() {
  const queryClient = await createServerQueryClient();
  await queryClient.prefetchQuery({
    ...assetReturnsQueryOptions(),
    queryFn: () => serverGet<AssetReturnListResponse>("/hr/asset-returns", assetReturnListContract),
  });
  return dehydrate(queryClient);
}
