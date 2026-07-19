"use client";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { ImportExportGrid } from "@/features/shared/import-export/import-export-grid";
import { CRM_IMPORT_EXPORT_ENTITIES } from "@/features/crm/settings/import-export-entities";

export default function CrmImportExportPage() {
  return (
    <PageWrapper
      title="Import / Export"
      subtitle="Export CRM data as CSV. Use CSV Import on Leads, Contacts, or Deals list pages for bulk uploads."
    >
      <ImportExportGrid entities={CRM_IMPORT_EXPORT_ENTITIES} />
    </PageWrapper>
  );
}
