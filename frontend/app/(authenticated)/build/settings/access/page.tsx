import { Suspense } from "react";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { BuildAccessShell } from "@/features/build/members/access-shell";
import { MembersPage } from "@/features/build/members/members-page";
import { ModuleAccessPage } from "@/features/module-access/module-access-page";
import { BuildAccessLoading } from "@/features/build/members/build-access-loading";

export const metadata = {
  title: "Access & Members",
};

export default async function BuildSettingsAccessRoute() {
  await enforceRouteAccess("/build/settings/access");
  return (
    <Suspense fallback={<BuildAccessLoading />}>
      <BuildAccessShell
        membersContent={<MembersPage />}
        accessContent={<ModuleAccessPage moduleKey="build" title="Build Access" />}
      />
    </Suspense>
  );
}
