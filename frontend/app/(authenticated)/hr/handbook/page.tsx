import { requirePermission } from "@/lib/rbac/require-permission";
import { HandbookPageClient } from "@/features/hr/handbook/handbook-page-client";

export default async function HandbookPage() {
  await requirePermission("hr:documents:manage");
  return <HandbookPageClient />;
}
