import type { ReactNode } from "react";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";

export default async function WorkflowsLayout({ children }: { children: ReactNode }) {
  await enforceRouteAccess("/workflows");
  return <>{children}</>;
}
