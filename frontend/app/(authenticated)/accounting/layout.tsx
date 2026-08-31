import { ReactNode } from "react";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";

export default async function AccountingLayout({ children }: { children: ReactNode }) {
  await enforceRouteAccess("/accounting");
  return <>{children}</>;
}
