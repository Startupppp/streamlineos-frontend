import { requirePermission } from "@/lib/rbac/require-permission";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { CrmImportPage } from "@/features/crm/import/import-page";

export default async function CrmImportRoute() {
  await requirePermission([
    "party:parties:view",
    "crm:imports:manage",
    "crm:leads:create",
    "crm:contacts:manage",
    "crm:deals:create",
  ]);
  return (
    <PageWrapper
      title="Import and export"
      subtitle="Bring your leads, contacts, deals and companies in from another CRM, or take all of it out."
    >
      <CrmImportPage />
    </PageWrapper>
  );
}
