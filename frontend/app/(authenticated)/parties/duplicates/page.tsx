import { requirePermission } from "@/lib/rbac/require-permission";
import { PartyDuplicatesPage } from "@/features/party/duplicates/party-duplicates-page";

export default async function PartyDuplicatesRoute() {
  await requirePermission("party:duplicates:view");
  return <PartyDuplicatesPage />;
}
