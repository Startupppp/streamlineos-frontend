import { ReimbursementBatchDetailPage } from "@/features/accounting/expenses/reimbursement-batch-detail-page";

export default async function Page({
  params,
}: {
  params: Promise<{ batchId: string }>;
}) {
  const { batchId } = await params;
  return <ReimbursementBatchDetailPage batchId={batchId} />;
}
