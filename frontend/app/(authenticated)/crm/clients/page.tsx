import { Suspense } from "react";
import { ClientListPage } from "@/features/crm/clients/client-list-page";

export default function CrmClientsPage() {
  return (
    <Suspense>
      <ClientListPage />
    </Suspense>
  );
}
