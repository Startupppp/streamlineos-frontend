import { requireModulePermission } from "@/lib/rbac/require-permission";
import { TemplateList } from "@/features/sign";

export default async function SignTemplatesPage() {
  await requireModulePermission("sign", "sign:template:manage");
  return <TemplateList />;
}
