import { requireSession } from "@/lib/rbac/require-permission";
import { RequireModule } from "@/components/auth/require-module";
import CompanyDocumentsPage from "@/features/wiki/components/company-documents-page";

export default async function KnowledgeBaseCompanyDocumentsRoute() {
  await requireSession();
  return (
    <RequireModule module="kb">
      <CompanyDocumentsPage />
    </RequireModule>
  );
}
