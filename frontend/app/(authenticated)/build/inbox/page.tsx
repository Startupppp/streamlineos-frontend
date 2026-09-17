import { requirePermission } from "@/lib/rbac/require-permission";
import { InboxPage } from "@/features/build/inbox/inbox-page";

export default async function BuildInboxRoute() {
  await requirePermission("build:tickets:view");
  return <InboxPage />;
}
