"use client";

import { apiClient } from "@/lib/api-client";
import { growthAndSignQueryKeys } from "@/lib/query-keys/growth-and-sign";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { couponListContract } from "./billing-growth-schema";

/** Coupons this organisation may redeem (platform-wide plus its own), newest first, capped at 100. */
export function useBillingCoupons() {
  return useGatedQuery("billing:coupons:manage", {
    queryKey: growthAndSignQueryKeys.billing.coupons(),
    queryFn: ({ signal }) => apiClient.get("/billing/coupons", undefined, signal, couponListContract),
    staleTime: 2 * 60_000,
  });
}
