"use client";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { LoadingState } from "@/components/shared/loading-state";
import { NoPermissionState } from "@/components/shared/no-permission-state";
import { useAccess } from "@/hooks/api/access";
import { CrmImportPage } from "@/features/crm/import/import-page";
import { useImportAccess } from "@/features/crm/import/use-import-access";

/**
 * Arriving and leaving.
 *
 * Open to anybody who may read the data or import any one of the four things
 * this page imports. Gating the route on party access alone would turn away a
 * sales manager who may bring deals in — which is exactly the hole the deals
 * import dialog used to slip through, by living on the deals page instead.
 */
export default function CrmImportRoute() {
  const { isPending } = useAccess();
  const { hasAny } = useImportAccess();

  return (
    <PageWrapper
      title="Import and export"
      subtitle="Bring your leads, contacts, deals and companies in from another CRM, or take all of it out."
    >
      {isPending ? (
        <LoadingState variant="page" />
      ) : !hasAny ? (
        <NoPermissionState
          permission="party:parties:view"
          description="You don’t have permission to read or import CRM data, so there is nothing here to import into or export from."
        />
      ) : (
        <CrmImportPage />
      )}
    </PageWrapper>
  );
}
