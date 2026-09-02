import { ReactNode } from "react";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";

export default async function ExecutiveBriefLayout({
  children,
}: {
  children: ReactNode;
}) {
  await enforceRouteAccess("/ai/executive-brief");
  return <>{children}</>;
}
