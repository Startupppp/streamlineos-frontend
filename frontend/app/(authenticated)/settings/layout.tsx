import type { ReactNode } from "react";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";

export default async function SettingsLayout({
  children,
}: {
  children: ReactNode;
}) {
  await enforceRouteAccess("/settings");
  return <>{children}</>;
}
