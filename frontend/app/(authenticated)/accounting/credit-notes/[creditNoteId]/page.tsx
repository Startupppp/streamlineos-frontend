import { requirePermission } from "@/lib/rbac/require-permission";
import { CreditNoteDetailClient } from "@/features/accounting/sales";

export default async function AccountingCreditNoteDetailPage({
  params,
}: {
  params: Promise<{ creditNoteId: string }>;
}) {
  await requirePermission("accounting:credit-notes:read");
  const { creditNoteId } = await params;
  return <CreditNoteDetailClient creditNoteId={creditNoteId} />;
}
