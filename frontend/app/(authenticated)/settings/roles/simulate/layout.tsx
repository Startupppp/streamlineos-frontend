import type { ReactNode } from "react";
import { requirePermission } from "@/lib/rbac/require-permission";

export default async function SimulateLayout({ children }: { children: ReactNode }) {
  await requirePermission("settings:rbac:manage");
  return children;
}
