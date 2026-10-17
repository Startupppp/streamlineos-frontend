import { ReactNode } from "react";
import { requirePermission } from "@/lib/rbac/require-permission";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";

export default async function RecruitmentLayout({ children }: { children: ReactNode }) {
  // Under /hr this ran in the HR layout; Recruitment OS now owns its own gate.
  await enforceRouteAccess("/recruitment");
  await requirePermission(
    [
      "hr:offers:view",
      "hr:interviews:view",
      "hr:requisitions:view",
    ],
    { redirectTo: "/dashboard" },
  );

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden [&>:first-child]:h-full [&>:first-child]:min-h-0 [&>:first-child]:flex-1">
      {children}
    </div>
  );
}
