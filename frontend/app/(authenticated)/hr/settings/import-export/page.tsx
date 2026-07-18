import { requirePermission } from "@/lib/rbac/require-permission";
import { ImportExportPage } from "@/features/hr/import-export";

export default async function HrImportExportPage() {
  await requirePermission(["hr:import:manage", "hr:export:manage"]);

  return <ImportExportPage />;
}
