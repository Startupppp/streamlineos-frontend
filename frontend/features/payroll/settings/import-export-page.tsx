"use client";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { ImportExportGrid } from "@/components/import-export/import-export-grid";
import { PAYROLL_IMPORT_EXPORT_ENTITIES } from "@/features/payroll/settings/import-export-entities";

export function PayrollImportExportContent() {
  return (
    <PageWrapper title="Import / Export" subtitle="Export payroll register data">
      <ImportExportGrid entities={PAYROLL_IMPORT_EXPORT_ENTITIES} />
    </PageWrapper>
  );
}
