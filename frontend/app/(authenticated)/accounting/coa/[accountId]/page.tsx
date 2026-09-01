import { AccountDetailPage } from "@/features/accounting/coa/account-detail-page";

interface Props {
  params: Promise<{ accountId: string }>;
}

export default async function AccountDetailRoute({ params }: Props) {
  const { accountId: accountIdStr } = await params;
  const accountId = Number.parseInt(accountIdStr, 10);
  return <AccountDetailPage accountId={accountId} />;
}
