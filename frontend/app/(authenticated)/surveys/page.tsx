import { requireModulePermission } from "@/lib/rbac/require-permission";
import { SurveysPage } from "@/features/surveys/list/surveys-page";

export default async function Page() {
  await requireModulePermission("surveys", "surveys:view");
  return <SurveysPage />;
}
