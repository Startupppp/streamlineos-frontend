import { Suspense } from "react";
import { requirePermission } from "@/lib/rbac/require-permission";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { OrgHubClient } from "@/features/hr/org/org-hub-client";
import { OrgHierarchyCompatBanner } from "@/features/hr/org/org-hierarchy-compat-banner";

/**
 * Ticket 05. Framed like Position Control: the route owns `PageWrapper` and the
 * Suspense fallback is the table skeleton the tab actually renders, so the first
 * paint matches the page instead of showing four stat cards this page has never
 * had.
 */
export default async function OrgHubPage() {
  await requirePermission("hr:employees:view");
  return (
    <PageWrapper
      title="Job Architecture"
      subtitle="Manage the job roles and levels used by HR records. Organization hierarchy lives in Organization settings."
    >
      <OrgHierarchyCompatBanner />
      <Suspense fallback={<DataTableSkeleton rows={10} headers={["Name", "Code", "Actions"]} />}>
        <OrgHubClient />
      </Suspense>
    </PageWrapper>
  );
}
