import { Suspense } from "react";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { BuildAccessShell } from "@/features/build/members/access-shell";
import { MembersPage } from "@/features/build/members/members-page";
import { ModuleAccessPage } from "@/features/module-access/module-access-page";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";

export const metadata = {
  title: "Access & Members",
};

const ACCESS_HEADERS = ["Name", "Role", "Added", "Teams", "Actions"] as const;

export default async function BuildSettingsAccessRoute() {
  await enforceRouteAccess("/build/settings/access");
  return (
    <Suspense
      fallback={<DataTableSkeleton mobileCards rows={10} headers={ACCESS_HEADERS} className="m-6" />}
    >
      <BuildAccessShell
        membersContent={<MembersPage />}
        accessContent={<ModuleAccessPage moduleKey="build" title="Build Access" />}
      />
    </Suspense>
  );
}
