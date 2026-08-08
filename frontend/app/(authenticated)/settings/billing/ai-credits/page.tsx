import type { Metadata } from "next";
import { AiCreditsSettingsPage } from "@/features/billing/ai-credits-settings-page";
import { requirePermission } from "@/lib/rbac/require-permission";

export const metadata: Metadata = {
  title: "AI Credits | StreamlineOS",
};

export default async function AiCreditsSettingsRoute() {
  await requirePermission("billing:ai-credits:view");
  return <AiCreditsSettingsPage />;
}
