"use client";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { ImportExportGrid } from "@/features/shared/import-export/import-export-grid";
import { CRM_IMPORT_EXPORT_ENTITIES } from "@/features/crm/settings/import-export-entities";

export default function CrmImportExportPage() {
  return (
    <PageWrapper
      title="Import / Export"
      subtitle="Import and export CRM leads, contacts, deals, and clients"
    >
      <ImportExportGrid entities={CRM_IMPORT_EXPORT_ENTITIES} />
    </PageWrapper>
  );
}
