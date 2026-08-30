import { type ReactNode } from "react";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";

export default async function MailLayout({ children }: { children: ReactNode }) {
  await enforceRouteAccess("/mail");
  return <>{children}</>;
}
