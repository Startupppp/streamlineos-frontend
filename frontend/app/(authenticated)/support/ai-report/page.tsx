import { requirePermission } from "@/lib/rbac/require-permission";
import { AiReportClient } from "@/features/support/ai-report";

export default async function SupportAiReportPage() {
  await requirePermission("support:reports:view");
  return <AiReportClient />;
}
