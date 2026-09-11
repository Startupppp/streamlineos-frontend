import { Suspense } from "react";
import { requirePermission } from "@/lib/rbac/require-permission";
import { NurtureSequenceDetailPage } from "@/features/crm/nurture/nurture-sequence-detail-page";

export default async function NurtureSequenceRoute({
  params,
}: {
  params: Promise<{ nurtureSequenceId: string }>;
}) {
  await requirePermission("crm:autonomy:view");
  const { nurtureSequenceId } = await params;

  return (
    <Suspense>
      <NurtureSequenceDetailPage nurtureSequenceId={nurtureSequenceId} />
    </Suspense>
  );
}
