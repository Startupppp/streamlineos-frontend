import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/rbac/require-permission";
import { prefetchHrExitDetail } from "@/lib/prefetch/hr-people";
import { ExitDetailPage } from "@/features/hr/exit/exit-detail-page";
import ExitDetailLoading from "./loading";

async function ExitDetailHydrated({ resignationId }: { resignationId: number }) {
  const state = await prefetchHrExitDetail(resignationId);
  return (
    <HydrationBoundary state={state}>
      <ExitDetailPage resignationId={resignationId} />
    </HydrationBoundary>
  );
}

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
      <ExitDetailHydrated resignationId={parsed} />
    </Suspense>
  );
}
