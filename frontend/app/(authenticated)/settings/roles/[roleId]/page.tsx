import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { RoleDetailPage } from "@/features/settings/roles/role-detail-page";
import { prefetchRoleDetail } from "@/lib/prefetch/settings";

export default async function Page({
  params,
}: {
  params: Promise<{ roleId: string }>;
}) {
  const { roleId } = await params;
  const state = await prefetchRoleDetail(roleId);
  return (
    <Suspense>
      <HydrationBoundary state={state}>
        <RoleDetailPage roleId={roleId} />
      </HydrationBoundary>
    </Suspense>
  );
}
