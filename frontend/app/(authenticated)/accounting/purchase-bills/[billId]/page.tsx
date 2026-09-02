import { PurchaseBillDetailPage } from "@/features/accounting/purchases/purchase-bill-detail-page";

export default async function Page({
  params,
}: {
  params: Promise<{ billId: string }>;
}) {
  const { billId } = await params;
  return <PurchaseBillDetailPage billId={billId} />;
}
