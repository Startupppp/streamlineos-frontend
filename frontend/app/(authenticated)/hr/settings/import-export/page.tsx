"use client";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { ImportExportGrid } from "@/features/shared/import-export/import-export-grid";
import { HR_IMPORT_EXPORT_ENTITIES } from "@/features/hr/settings/import-export-entities";

export default function HrImportExportPage() {
  return (
    <PageWrapper
      title="Import / Export"
      subtitle="Export employee, expense, and asset data"
    >
      <ImportExportGrid entities={HR_IMPORT_EXPORT_ENTITIES} />
    </PageWrapper>
  );
}
