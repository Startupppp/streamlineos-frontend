import { BankAccountDetailClient } from "@/features/accounting/banking/components/bank-account-detail-client";

interface PageProps {
  params: Promise<{ bankAccountId: string }>;
}

export default async function BankAccountDetailPage({ params }: PageProps) {
  const { bankAccountId } = await params;
  return <BankAccountDetailClient bankAccountId={bankAccountId} />;
}
