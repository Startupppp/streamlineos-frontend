import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/rbac/require-permission";
import { ExitDetailPage } from "@/features/hr/exit/exit-detail-page";
import ExitDetailLoading from "./loading";

export default async function HrExitDetailPage({
  params,
}: {
  params: Promise<{ resignationId: string }>;
}) {
  const [, { resignationId }] = await Promise.all([requirePermission("hr:exit:view"), params]);
  const parsed = Number(resignationId);
  if (!Number.isInteger(parsed) || parsed <= 0) notFound();
  return (
    <Suspense fallback={<ExitDetailLoading />}>
      <ExitDetailPage resignationId={parsed} />
    </Suspense>
  );
}
