import { requirePermission } from "@/lib/rbac/require-permission";
import { SubjectTypesPage } from "@/features/party/subject-types/subject-types-page";

export default async function SubjectTypesRoute() {
  await requirePermission("party:subjects:view");
  return <SubjectTypesPage />;
}
