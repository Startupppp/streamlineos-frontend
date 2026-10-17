import type { Metadata } from "next";
import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { BillingCouponsPage } from "@/features/billing/coupons/billing-coupons-page";
import { requirePermission } from "@/lib/rbac/require-permission";
import { prefetchBillingCoupons } from "@/lib/prefetch/settings-billing";

export const metadata: Metadata = {
  title: "Coupons | StreamlineOS",
};

export default async function BillingCouponsRoute() {
  await requirePermission("billing:coupons:manage");
  const state = await prefetchBillingCoupons();
  return (
    <Suspense>
      <HydrationBoundary state={state}>
        <BillingCouponsPage />
      </HydrationBoundary>
    </Suspense>
  );
}
