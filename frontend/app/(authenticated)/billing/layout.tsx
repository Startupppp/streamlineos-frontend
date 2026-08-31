import type { ReactNode } from "react";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";

export default async function BillingLayout({
  children,
}: {
  children: ReactNode;
}) {
  await enforceRouteAccess("/billing/invoices");
  return <>{children}</>;
}
