import { Suspense } from "react";
import { CompanyListPage } from "@/features/crm/companies/company-list-page";

export default function CrmCompaniesPage() {
  return (
    <Suspense>
      <CompanyListPage />
    </Suspense>
  );
}
