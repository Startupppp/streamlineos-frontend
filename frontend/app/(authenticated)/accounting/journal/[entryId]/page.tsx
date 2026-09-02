import { JournalEntryDetailPage } from "@/features/accounting/core/journal-entry-detail-page";

export default async function Page({
  params,
}: {
  params: Promise<{ entryId: string }>;
}) {
  const { entryId } = await params;
  return <JournalEntryDetailPage entryId={entryId} />;
}
