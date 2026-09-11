import { requireModulePermission } from "@/lib/rbac/require-permission";
import { SignSettingsPage } from "@/features/sign";

export default async function SignSettingsRoutePage() {
  await requireModulePermission("sign", "sign:admin:manage");
  return <SignSettingsPage />;
}
