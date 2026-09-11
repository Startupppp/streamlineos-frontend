import { ReactNode } from "react";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";

export default async function SurveysLayout({ children }: { children: ReactNode }) {
  await enforceRouteAccess("/surveys");
  return <>{children}</>;
}
