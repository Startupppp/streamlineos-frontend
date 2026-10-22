import type { Metadata } from "next";
import { IncomingTransferPage } from "@/features/settings/organization/incoming-transfer-page";
import { requirePermission } from "@/lib/rbac/require-permission";

export const metadata: Metadata = {
  title: "Incoming Ownership Transfer",
};

export default async function IncomingTransferRoute() {
  await requirePermission("ownership:transfer:respond");
  return <IncomingTransferPage />;
}
