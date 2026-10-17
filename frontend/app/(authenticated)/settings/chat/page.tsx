import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { prefetchChatOrgSettings } from "@/lib/prefetch/settings-admin";
import { ChatOrgSettingsPage } from "@/features/chat/chat-org-settings-page";

export default async function ChatSettingsRoute() {
  await requirePermission("chat:org-settings:manage");
  const state = await prefetchChatOrgSettings();
  return (
    <HydrationBoundary state={state}>
      <ChatOrgSettingsPage />
    </HydrationBoundary>
  );
}
