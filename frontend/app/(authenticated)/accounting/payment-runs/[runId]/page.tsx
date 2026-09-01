import { PaymentRunDetailPage } from "@/features/accounting/ap/payment-run-detail-page";

export default async function Page({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = await params;
  return <PaymentRunDetailPage runId={Number(runId)} />;
}
