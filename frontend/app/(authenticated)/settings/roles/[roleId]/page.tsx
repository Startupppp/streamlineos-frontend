import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { RoleDetailPage } from "@/features/settings/roles/role-detail-page";
import { prefetchRoleDetail } from "@/lib/prefetch/settings";

export default async function Page({
  params,
}: {
  params: Promise<{ roleId: string }>;
}) {
  await requirePermission("settings:rbac:manage");
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
