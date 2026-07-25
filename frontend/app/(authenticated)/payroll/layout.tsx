import { type ReactNode } from "react";
import { requireSession } from "@/lib/rbac/require-permission";
import { RequireModule } from "@/components/auth/require-module";
import "@/features/payroll/shared/payroll-os.css";

export default async function PayrollLayout({ children }: { children: ReactNode }) {
  await requireSession();
  return (
    <RequireModule module="payroll">
      <div className="payroll-os min-h-0 flex-1 flex flex-col">{children}</div>
    </RequireModule>
  );
}
