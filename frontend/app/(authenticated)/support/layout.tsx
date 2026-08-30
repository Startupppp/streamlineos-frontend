import type { ReactNode } from "react";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";

export default async function SupportLayout({
  children,
}: {
  children: ReactNode;
}) {
  await enforceRouteAccess("/support");
  return <>{children}</>;
}
