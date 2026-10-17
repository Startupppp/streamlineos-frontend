import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { prefetchPrivacyRequests } from "@/lib/prefetch/settings-admin";
import { toSearchParams, type RouteSearchParams } from "@/lib/route-search-params";
import { PrivacyRequestsPage } from "@/features/settings/privacy/privacy-requests-page";
import { readSubjectFilter } from "@/features/settings/privacy/subject-request-schema";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<RouteSearchParams>;
}) {
  await requirePermission(["hr:retention:manage", "compliance:subject-requests:view"]);
  const params = toSearchParams(await searchParams);
  const state = await prefetchPrivacyRequests(readSubjectFilter(params.get("subject") ?? ""));
  return (
    <Suspense>
      <HydrationBoundary state={state}>
        <PrivacyRequestsPage />
      </HydrationBoundary>
    </Suspense>
  );
}
