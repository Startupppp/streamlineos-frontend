import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/rbac/require-permission";
import { ExitDetailPage } from "@/features/hr/exit/exit-detail-page";

export default async function HrExitDetailPage({
  params,
}: {
  params: Promise<{ resignationId: string }>;
}) {
  const [, { resignationId }] = await Promise.all([requirePermission("hr:exit:view"), params]);
  const parsed = Number(resignationId);
  if (!Number.isInteger(parsed) || parsed <= 0) notFound();
  return <ExitDetailPage resignationId={parsed} />;
}
