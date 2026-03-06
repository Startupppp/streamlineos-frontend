import { useQuery } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { vaivammTrpcClient } from "../trpc";
import { vaivammKeys } from "./trpc-keys";
import type { CrmRouterOutputs } from "./trpc-keys";

export function useSalesDashboard(
  options?: Partial<UseQueryOptions<CrmRouterOutputs["getSalesDashboard"]>>
) {
  return useQuery<CrmRouterOutputs["getSalesDashboard"]>({
    queryKey: vaivammKeys.crm.salesDashboard(),
    queryFn: () => vaivammTrpcClient.crm.getSalesDashboard.query(),
    ...options,
  });
}

export function useCustomerExecutiveDashboard(
  options?: Partial<UseQueryOptions<CrmRouterOutputs["getCustomerExecutiveDashboard"]>>
) {
  return useQuery<CrmRouterOutputs["getCustomerExecutiveDashboard"]>({
    queryKey: vaivammKeys.crm.customerExecutiveDashboard(),
    queryFn: () => vaivammTrpcClient.crm.getCustomerExecutiveDashboard.query(),
    ...options,
  });
}

export function useMarketingDashboard(
  options?: Partial<UseQueryOptions<CrmRouterOutputs["getMarketingDashboard"]>>
) {
  return useQuery<CrmRouterOutputs["getMarketingDashboard"]>({
    queryKey: vaivammKeys.crm.marketingDashboard(),
    queryFn: () => vaivammTrpcClient.crm.getMarketingDashboard.query(),
    ...options,
  });
}

export function useSupportDashboard(
  options?: Partial<UseQueryOptions<CrmRouterOutputs["getSupportDashboard"]>>
) {
  return useQuery<CrmRouterOutputs["getSupportDashboard"]>({
    queryKey: vaivammKeys.crm.supportDashboard(),
    queryFn: () => vaivammTrpcClient.crm.getSupportDashboard.query(),
    ...options,
  });
}

export function useCrmPerson(
  slug: string,
  options?: Partial<UseQueryOptions<CrmRouterOutputs["getPersonBySlug"]>>
) {
  return useQuery<CrmRouterOutputs["getPersonBySlug"]>({
    queryKey: vaivammKeys.crm.person(slug),
    queryFn: () => vaivammTrpcClient.crm.getPersonBySlug.query({ slug }),
    enabled: !!slug,
    ...options,
  });
}

export function useCrmPeopleSlugs(
  options?: Partial<UseQueryOptions<CrmRouterOutputs["getAllPeopleSlugs"]>>
) {
  return useQuery<CrmRouterOutputs["getAllPeopleSlugs"]>({
    queryKey: vaivammKeys.crm.allPeopleSlugs(),
    queryFn: () => vaivammTrpcClient.crm.getAllPeopleSlugs.query(),
    ...options,
  });
}
