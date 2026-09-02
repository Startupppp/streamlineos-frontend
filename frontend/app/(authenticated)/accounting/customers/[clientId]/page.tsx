import { CustomerDetailPage } from "@/features/accounting/sales/customer-detail-page";

export default async function Page({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  return <CustomerDetailPage clientId={clientId} />;
}
