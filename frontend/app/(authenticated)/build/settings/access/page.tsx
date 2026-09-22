import { Suspense } from "react";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { MembersPage } from "@/features/build/members/members-page";
import { ModuleAccessPage } from "@/features/module-access/module-access-page";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";

export const metadata = {
  title: "Access & Members",
};

export default async function BuildSettingsAccessRoute() {
  await enforceRouteAccess("/build/settings/access");
  return (
    <>
      <Suspense
        fallback={<DataTableSkeleton rows={10} columns={5} className="m-6" />}
      >
        <MembersPage />
      </Suspense>
      <ModuleAccessPage moduleKey="build" title="Build Access" />
    </>
  );
}
