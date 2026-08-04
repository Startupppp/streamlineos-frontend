import { requirePermission } from "@/lib/rbac/require-permission";
import { WorkerDetailPage } from "@/features/payroll/employees/worker-detail-page";

export const metadata = { title: "Worker Salary Profile — Payroll" };

interface Props {
  params: Promise<{ workerId: string }>;
}

export default async function WorkerProfileDetailPage({ params }: Props) {
  const { workerId } = await params;
  await requirePermission("payroll:salaries:view");
  return <WorkerDetailPage workerId={workerId} />;
}
