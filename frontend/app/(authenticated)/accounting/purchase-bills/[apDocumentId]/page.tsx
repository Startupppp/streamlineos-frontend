import { BillDetailPage } from "@/features/accounting/purchases/bills/bill-detail-page";

interface PageProps {
  params: Promise<{ apDocumentId: string }>;
}

export default async function AccountingBillDetailPage({ params }: PageProps) {
  const { apDocumentId } = await params;
  return <BillDetailPage apDocumentId={apDocumentId} />;
}
