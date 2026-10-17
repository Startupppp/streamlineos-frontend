import type { Metadata } from "next";
import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { EnterpriseQuotesPage } from "@/features/billing/enterprise-quotes/enterprise-quotes-page";
import {
  ENTERPRISE_QUOTE_PAGE_SIZE,
  readQuoteStatus,
} from "@/features/billing/enterprise-quotes/enterprise-quote-list-state";
import { requirePermission } from "@/lib/rbac/require-permission";
import { toSearchParams, type RouteSearchParams } from "@/lib/route-search-params";
import { prefetchEnterpriseQuotes } from "@/lib/prefetch/settings-billing";

export const metadata: Metadata = {
  title: "Enterprise Quotes | StreamlineOS",
};

export default async function EnterpriseQuotesRoute({
  searchParams,
}: {
  searchParams: Promise<RouteSearchParams>;
}) {
  await requirePermission("billing:enterprise-quotes:view");
  const params = toSearchParams(await searchParams);
  const state = await prefetchEnterpriseQuotes({
    status: readQuoteStatus(params.get("status")),
    limit: ENTERPRISE_QUOTE_PAGE_SIZE,
  });
  return (
    <Suspense>
      <HydrationBoundary state={state}>
        <EnterpriseQuotesPage />
      </HydrationBoundary>
    </Suspense>
  );
}
