import { Metadata } from "next";
import { Suspense } from "react";
import { OrgAuditLogPage } from "@/features/users/org-audit-log-page";

export const metadata: Metadata = {
  title: "Audit Log | StreamlineOS",
};

export default function Page() {
  return (
    <Suspense>
      <OrgAuditLogPage />
    </Suspense>
  );
}
