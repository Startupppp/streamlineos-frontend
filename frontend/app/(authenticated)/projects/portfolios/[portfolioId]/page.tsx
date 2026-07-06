import { PortfolioDetailPage } from "@/features/projects/portfolios/portfolio-detail-page";

interface Props {
  params: Promise<{ portfolioId: string }>;
}

export default async function PortfolioDetailRoute({ params }: Props) {
  const { portfolioId } = await params;
  return <PortfolioDetailPage portfolioId={parseInt(portfolioId, 10)} />;
}
