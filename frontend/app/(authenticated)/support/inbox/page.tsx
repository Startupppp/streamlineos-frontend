import { requirePermission } from "@/lib/rbac/require-permission";
import { SupportInboxPage } from "@/features/support/inbox/support-inbox-page";

export default async function Page() {
  await requirePermission("support:tickets:view");
  return <SupportInboxPage />;
}
