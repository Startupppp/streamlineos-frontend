import { requirePermission } from "@/lib/rbac/require-permission";
import { FnfPageClient } from "@/features/hr/fnf/fnf-page-client";

export default async function FnfPage() {
  await requirePermission("hr:payroll:approve");
  return <FnfPageClient />;
}
