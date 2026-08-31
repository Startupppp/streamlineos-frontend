import { type ReactNode } from "react";
import { RequireModule } from "@/components/auth/require-module";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import "@/features/payroll/shared/payroll-os.css";

export default async function PayrollLayout({ children }: { children: ReactNode }) {
  await enforceRouteAccess("/payroll");
  return (
    <RequireModule module="payroll">
      <div className="payroll-os min-h-0 flex-1 flex flex-col">{children}</div>
    </RequireModule>
  );
}
