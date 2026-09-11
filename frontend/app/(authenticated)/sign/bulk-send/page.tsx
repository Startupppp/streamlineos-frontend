import { requireModulePermission } from "@/lib/rbac/require-permission";
import { BulkSendList } from "@/features/sign";

export default async function SignBulkSendPage() {
  await requireModulePermission("sign", "sign:bulk_send:run");
  return <BulkSendList />;
}
