import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { PortfolioDetailPage } from "@/features/build/portfolios/portfolio-detail-page";

interface Props {
  params: Promise<{ portfolioId: string }>;
}

export default async function PortfolioDetailRoute({ params }: Props) {
  await enforceRouteAccess("/build/portfolios/[portfolioId]");
  const { portfolioId } = await params;
  return <PortfolioDetailPage portfolioId={parseInt(portfolioId, 10)} />;
}
