import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { ChannelsDiscoveryPage } from "@/features/chat/channels-discovery-page";
import { ChatShell } from "@/features/chat/chat-shell";

export default async function ChatChannelsPage() {
  await enforceRouteAccess("/chat/channels");
  return (
    <div className="flex flex-1 min-h-0 flex-col">
      <ChatShell>
        <ChannelsDiscoveryPage />
      </ChatShell>
    </div>
  );
}
