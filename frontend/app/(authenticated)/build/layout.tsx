import type { ReactNode } from "react";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";

export default async function BuildLayout({
  children,
}: {
  children: ReactNode;
}) {
  await enforceRouteAccess("/build");
  return <>{children}</>;
}
