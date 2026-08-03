import { requirePermission } from "@/lib/rbac/require-permission";
import { WorkersPage } from "@/features/directory/workers/workers-page";

export default async function WorkersRoute() {
  await requirePermission("workforce:workers:view");
  return <WorkersPage />;
}
