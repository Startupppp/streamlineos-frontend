import type { ReactNode } from "react";
import { requirePermission } from "@/lib/rbac/require-permission";

export default async function AuditLayout({ children }: { children: ReactNode }) {
  await requirePermission("audit-log:read");
  return children;
}
