import { BudgetDetailPage } from "@/features/accounting/planning/budget-detail-page";

export default async function Page({
  params,
}: {
  params: Promise<{ budgetId: string }>;
}) {
  const { budgetId } = await params;
  return <BudgetDetailPage budgetId={budgetId} />;
}
