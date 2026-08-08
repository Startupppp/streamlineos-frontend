import type { Metadata } from "next";
import { BillingSettingsPage } from "@/features/billing/billing-settings-page";
import { requirePermission } from "@/lib/rbac/require-permission";

export const metadata: Metadata = {
  title: "Billing & Plan | StreamlineOS",
};

export default async function BillingSettingsRoute() {
  await requirePermission("settings:manage");
  return <BillingSettingsPage />;
}
