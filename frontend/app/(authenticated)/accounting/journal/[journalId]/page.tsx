import { JournalViewClient } from "@/features/accounting/ledger";

export default async function JournalPage({
  params,
}: {
  params: Promise<{ journalId: string }>;
}) {
  const { journalId } = await params;
  return <JournalViewClient journalId={journalId} />;
}
