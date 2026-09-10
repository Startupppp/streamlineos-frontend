import type { Metadata } from "next";
import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { PeoplePage } from "@/features/directory/users/people-page";
import { readUsersListState } from "@/features/directory/users/users-list-state";
import { requirePermission } from "@/lib/rbac/require-permission";
import { toSearchParams, type RouteSearchParams } from "@/lib/route-search-params";
import { prefetchSettingsUsers } from "@/lib/prefetch/settings-admin";

export const metadata: Metadata = {
  title: "Members & Access | StreamlineOS",
};

export default async function MembersAndAccessRoute({
  searchParams,
}: {
  searchParams: Promise<RouteSearchParams>;
}) {
  await requirePermission("settings:view");
  const params = toSearchParams(await searchParams);
  const state = await prefetchSettingsUsers(readUsersListState(params));
  return (
    <Suspense>
      <HydrationBoundary state={state}>
        <PeoplePage />
      </HydrationBoundary>
    </Suspense>
  );
}
