import { requirePermission } from "@/lib/rbac/require-permission";
import { BackgroundVerificationPageClient } from "@/features/hr/background-verification/background-verification-page-client";

export default async function BackgroundVerificationPage() {
  await requirePermission("hr:employees:update");
  return <BackgroundVerificationPageClient />;
}
