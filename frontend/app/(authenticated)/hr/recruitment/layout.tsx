import { ReactNode } from "react";
import { requirePermission } from "@/lib/rbac/require-permission";
import { RecruitmentSidebar } from "@/components/layout/recruitment-sidebar";

export default async function RecruitmentLayout({ children }: { children: ReactNode }) {
  await requirePermission(
    [
      "hr:employees:view",
      "hr:employees:create",
      "hr:offers:view",
      "hr:interviews:view",
      "hr:requisitions:view",
    ],
    { redirectTo: "/hr" },
  );

  return (
    <div className="flex flex-col md:flex-row h-full w-full">
      <RecruitmentSidebar />
      <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-y-auto">{children}</div>
    </div>
  );
}
