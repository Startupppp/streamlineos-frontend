import type { Metadata } from "next";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Chat Settings | StreamlineOS" };

export default async function ChatSettingsPage() {
  await enforceRouteAccess("/chat/settings");
  return (
    <PageWrapper title="Chat Settings" subtitle="Organisation-wide chat configuration">
      <EmptyState
        title="Chat settings"
        description="Organisation-wide chat configuration is managed here. Full settings UI is coming soon."
        className="flex-1"
      />
    </PageWrapper>
  );
}
