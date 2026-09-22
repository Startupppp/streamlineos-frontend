import type { ReactNode } from "react";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";

export default async function NotificationsLayout({ children }: { children: ReactNode }) {
  await enforceRouteAccess("/notifications");
  return <>{children}</>;
}
