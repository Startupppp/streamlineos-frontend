"use client";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { useCan } from "@/hooks/api/access";
import { CrmImportPage } from "@/features/crm/import/import-page";

/**
 * Arriving and leaving.
 *
 * Gated on reading parties rather than on importing: export is ungated by
 * design, so somebody who may read the data can always take it with them even
 * if they may not bring more in.
 */
export default function CrmImportRoute() {
  const canRead = useCan("party:parties:view");

  if (!canRead) return null;

  return (
    <PageWrapper
      title="Import and export"
      subtitle="Bring your data in from another CRM, or take all of it out."
    >
      <CrmImportPage />
    </PageWrapper>
  );
}
