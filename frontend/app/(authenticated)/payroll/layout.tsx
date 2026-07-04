import { type ReactNode } from "react";
import { requireSession } from "@/lib/rbac/require-permission";

export default async function PayrollLayout({ children }: { children: ReactNode }) {
  await requireSession();
  return <>{children}</>;
}
