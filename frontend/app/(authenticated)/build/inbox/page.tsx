import { requireSession } from "@/lib/rbac/require-permission";
import { InboxPage } from "@/features/build/inbox/inbox-page";

export default async function Page() {
  await requireSession();
  return <InboxPage />;
}
