import { Metadata } from "next";
import { OrgAuditLogPage } from "@/features/users/org-audit-log-page";

export const metadata: Metadata = {
  title: "Audit Log | StreamlineOS",
};

export default function Page() {
  return <OrgAuditLogPage />;
}
