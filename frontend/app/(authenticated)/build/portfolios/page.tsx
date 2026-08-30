import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { PortfoliosPage } from "@/features/build/portfolios/portfolios-page";

export default async function PortfoliosRoute() {
  await enforceRouteAccess("/build/portfolios");
  return <PortfoliosPage />;
}
