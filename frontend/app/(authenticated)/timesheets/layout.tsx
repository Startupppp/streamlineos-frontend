import type { ReactNode } from "react";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";

export default async function TimesheetsLayout({
  children,
}: {
  children: ReactNode;
}) {
  await enforceRouteAccess("/timesheets");
  return <>{children}</>;
}
