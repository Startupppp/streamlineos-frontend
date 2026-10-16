import { MyResignationPage } from "@/features/me/resignation/my-resignation-page";
import { requirePermission } from "@/lib/rbac/require-permission";

export default async function MyResignationRoute() {
  await requirePermission("self:resignation");
  return <MyResignationPage />;
}
