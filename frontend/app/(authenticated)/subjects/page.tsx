import { requirePermission } from "@/lib/rbac/require-permission";
import { SubjectsPage } from "@/features/party/subjects/subjects-page";

export default async function SubjectsRoute() {
  await requirePermission("party:subjects:view");
  return <SubjectsPage />;
}
