import { ReactNode } from "react";
import { requirePermission } from "@/lib/rbac/require-permission";

export default async function RecruitmentLayout({ children }: { children: ReactNode }) {
  await requirePermission(
    [
      "hr:offers:view",
      "hr:interviews:view",
      "hr:requisitions:view",
    ],
    { redirectTo: "/hr" },
  );

  return <>{children}</>;
}
