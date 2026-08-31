import type { ReactNode } from "react";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";

export default async function CrmLayout({ children }: { children: ReactNode }) {
  await enforceRouteAccess("/crm");
  return <>{children}</>;
}
