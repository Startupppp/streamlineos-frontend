import type { Metadata } from "next";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { ChatOrgSettingsPage } from "@/features/chat/settings/chat-org-settings-page";

export const metadata: Metadata = { title: "Chat Settings | StreamlineOS" };

export default async function ChatSettingsRoute() {
  await enforceRouteAccess("/chat/settings");
  return (
    <PageWrapper
      title="Chat Settings"
      subtitle="Organisation-wide chat defaults and limits"
      backHref="/chat"
      backLabel="Back to Chat"
    >
      <ChatOrgSettingsPage />
    </PageWrapper>
  );
}
