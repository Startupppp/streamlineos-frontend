import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/rbac/require-permission";

export default async function CompanyHrProfilePage() {
  await requirePermission("settings:organization:manage");
  redirect("/settings/organization");
}
