import type { ReactNode } from "react";
import { requirePermission } from "@/lib/rbac/require-permission";

export default async function OrganizationSettingsLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requirePermission("settings:view");
  return children;
}
