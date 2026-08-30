import type { ReactNode } from "react";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { NotificationsNav } from "@/features/notifications/notifications-nav";

export default async function NotificationsLayout({ children }: { children: ReactNode }) {
  await enforceRouteAccess("/notifications");
  return (
    <div className="flex flex-1 min-h-0 flex-col">
      <NotificationsNav />
      <div className="flex flex-1 min-h-0 flex-col">{children}</div>
    </div>
  );
}
