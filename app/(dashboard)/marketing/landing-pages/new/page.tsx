import { PageBuilder } from "@/features/marketing/landing-pages/page-builder";
import { requirePermission } from "@/lib/rbac/require-permission";

export default async function NewLandingPagePage() {
  await requirePermission(["dm:campaigns:create", "settings:manage"]);
  return <PageBuilder />;
}
