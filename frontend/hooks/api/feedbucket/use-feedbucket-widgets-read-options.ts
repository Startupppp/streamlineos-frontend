import { growthAndSignQueryKeys } from "@/lib/query-keys/growth-and-sign";

export interface WidgetListParams {
  managedProductId?: number;
  cursor?: string;
  limit?: number;
}

export function feedbucketWidgetsQueryOptions(params?: WidgetListParams) {
  return {
    queryKey: growthAndSignQueryKeys.feedbucket.widgets(params),
    staleTime: 30_000,
  };
}
