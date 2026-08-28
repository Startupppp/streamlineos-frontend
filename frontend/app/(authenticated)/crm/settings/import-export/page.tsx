import { requirePermission } from "@/lib/rbac/require-permission";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { ImportExportGrid } from "@/features/shared/import-export/import-export-grid";
import { CRM_IMPORT_EXPORT_ENTITIES } from "@/features/crm/settings/import-export-entities";

export default async function CrmImportExportPage() {
  await requirePermission("crm:settings:manage");
  return (
    <PageWrapper
      title="Import / Export"
      subtitle="Export CRM data as CSV. Bringing data in happens at CRM → Import and export."
    >
      <ImportExportGrid entities={CRM_IMPORT_EXPORT_ENTITIES} />
    </PageWrapper>
  );
}
