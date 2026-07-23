"use client";

import { use } from "react";
import { useSession } from "next-auth/react";
import { MessageCircle } from "lucide-react";
import { useEntityChannel } from "@/hooks/api/chat";
import { isApiError } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/get-error-message";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PmPageShell, PmPanel } from "@/features/projects/shared/pm-chrome";
import { ChatAblyProvider } from "@/features/chat/ably-provider";
import { MessagePanel } from "@/features/chat/message-panel";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

const noop = () => {};

export default function ProjectChatRoute({ params }: PageProps) {
  const { projectId } = use(params);
  const { data: session } = useSession();
  const currentUserId = session?.user?.id ?? "";
  const { data: channel, error, isLoading } = useEntityChannel("project", projectId);

  const isNotFound = isApiError(error) && error.status === 404;

  if (isLoading) {
    return null;
  }

  if (isNotFound || (!isLoading && !error && !channel)) {
    return (
      <PageWrapper noInternalScroll>
        <PmPageShell>
          <PmPanel
            className="flex flex-1 min-h-0 flex-col items-center justify-center gap-3 p-10 text-center"
            solid
          >
            <MessageCircle className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm font-medium text-foreground">No chat channel linked</p>
            <p className="text-xs text-muted-foreground max-w-xs">
              This project does not have an associated chat channel yet. Ask a project admin to
              link one from the project settings.
            </p>
          </PmPanel>
        </PmPageShell>
      </PageWrapper>
    );
  }

  if (error) {
    return (
      <PageWrapper noInternalScroll>
        <PmPageShell>
          <PmPanel
            className="flex flex-1 min-h-0 flex-col items-center justify-center gap-3 p-8 text-center"
            solid
          >
            <p className="text-sm text-muted-foreground">{getErrorMessage(error)}</p>
          </PmPanel>
        </PmPageShell>
      </PageWrapper>
    );
  }

  if (!channel?.id || !currentUserId) {
    return null;
  }

  return (
    <PageWrapper noInternalScroll>
      <PmPageShell withGlow={false}>
        <PmPanel className="flex flex-1 min-h-0 overflow-hidden p-0" solid>
          <ChatAblyProvider>
            <MessagePanel
              channelId={channel.id}
              currentUserId={currentUserId}
              onBack={noop}
              onToggleInfo={noop}
              showInfoPanel={false}
            />
          </ChatAblyProvider>
        </PmPanel>
      </PmPageShell>
    </PageWrapper>
  );
}
