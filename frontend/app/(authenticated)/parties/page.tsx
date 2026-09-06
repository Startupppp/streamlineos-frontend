import { requirePermission } from "@/lib/rbac/require-permission";
import { PartiesPage } from "@/features/party/parties/parties-page";

export default async function PartiesRoute() {
  await requirePermission("party:parties:view");
  return <PartiesPage />;
}
