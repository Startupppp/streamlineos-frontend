import { ReactNode } from "react";
import { requirePermission } from "@/lib/rbac/require-permission";

export default async function AccountingLayout({ children }: { children: ReactNode }) {
  await requirePermission("accounting:read", { redirectTo: "/dashboard" });
  return <>{children}</>;
}
