import type { Metadata } from "next";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Chat Moderation | StreamlineOS" };

export default async function ChatModerationPage() {
  await enforceRouteAccess("/chat/moderation");
  return (
    <PageWrapper title="Chat Moderation" subtitle="Manage active huddles and participants">
      <EmptyState
        title="Huddle moderation"
        description="Active huddle management and participant controls are shown here. Full moderation UI is coming soon."
        className="flex-1"
      />
    </PageWrapper>
  );
}
