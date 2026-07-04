import { type ReactNode } from "react";
import { requireSession } from "@/lib/rbac/require-permission";
import { RequireModule } from "@/components/auth/require-module";

export default async function PayrollLayout({ children }: { children: ReactNode }) {
  await requireSession();
  return <RequireModule module="payroll">{children}</RequireModule>;
}
