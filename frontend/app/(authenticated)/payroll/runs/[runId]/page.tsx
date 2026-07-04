import { requirePermission } from "@/lib/rbac/require-permission";
import { RunDetailContent } from "./run-detail-content";

interface PageProps {
  params: Promise<{ runId: string }>;
}

export const metadata = { title: "Payroll Run — Detail" };

export default async function PayrollRunDetailPage({ params }: PageProps) {
  await requirePermission("payroll:runs:view");
  const { runId: runIdStr } = await params;
  return <RunDetailContent runId={parseInt(runIdStr, 10)} />;
}
