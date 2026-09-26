"use client";

import { useCallback, useState } from "react";
import { useSession } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useCreateEntityChannel, useEntityChannel } from "@/hooks/api/chat";
import { useCan } from "@/hooks/api/access";
import { getErrorMessage } from "@/lib/get-error-message";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { ChatAblyProvider } from "./ably-provider";
import { MessagePanel } from "./message-panel";
import { ChannelInfoPanel } from "./channel-info-panel";
import { useIsChatPanelNarrow } from "./use-chat-mobile";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { PM_PANEL_SOLID, PmPageShell } from "@/components/pm-chrome";

interface ProjectChatPageProps {
  projectId: string;
}

const noop = () => {};

export function BuildProjectChatPage({ projectId }: ProjectChatPageProps) {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id ?? "";
  const { data: channel, error, isLoading, isError, refetch } = useEntityChannel(
    "project",
    projectId,
  );
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const isPanelNarrow = useIsChatPanelNarrow();
  const canCreateChannel = useCan("chat:channels:write");
  const createEntityChannel = useCreateEntityChannel();

  const pageState = usePageState({
    permission: "build:view",
    isLoading,
    isError,
    error,
    isEmpty: !isLoading && !error && !channel?.id,
  });

  const handleToggleInfo = useCallback(() => {
    setShowInfoPanel((open) => !open);
  }, []);

  const handleCloseInfo = useCallback(() => {
    setShowInfoPanel(false);
  }, []);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleCreateChannel = useCallback(() => {
    createEntityChannel.mutate(
      { entityType: "project", entityId: projectId },
      {
        onSuccess: () => {
          toast.success("Project chat channel created");
        },
        onError: (mutationError) => {
          toast.error(getErrorMessage(mutationError));
        },
      },
    );
  }, [createEntityChannel, projectId]);

  const emptyContent = (
    <EmptyState
      className="flex-1"
      illustrationPreset="chat"
      title="No chat channel linked"
      description={
        canCreateChannel
          ? "This project does not have an associated chat channel yet. Create one to start the conversation."
          : "This project does not have an associated chat channel yet. Ask a project admin to link one from the project settings."
      }
      action={
        canCreateChannel
          ? {
              label: createEntityChannel.isPending
                ? "Creating channel…"
                : "Create chat channel",
              onClick: handleCreateChannel,
            }
          : undefined
      }
    />
  );

  return (
    <PageWrapper noInternalScroll>
      <PmPageShell>
        <PageState
          resolution={pageState}
          loading={null}
          empty={emptyContent}
          onRetry={handleRetry}
        >
          {channel?.id && currentUserId ? (
            <div className={cn(PM_PANEL_SOLID, "overflow-hidden flex flex-1 min-h-0 overflow-hidden p-0")}>
              <ChatAblyProvider>
                <div className="flex min-h-0 min-w-0 flex-1">
                  <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                    <MessagePanel
                      channelId={channel.id}
                      currentUserId={currentUserId}
                      onBack={noop}
                      onToggleInfo={handleToggleInfo}
                      showInfoPanel={showInfoPanel}
                    />
                  </div>
                  <AnimatePresence>
                    {!isPanelNarrow && showInfoPanel && (
                      <motion.div
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: 320, opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        className="flex shrink-0 flex-col overflow-hidden border-l border-border/40 bg-card/50"
                      >
                        <ChannelInfoPanel
                          channelId={channel.id}
                          currentUserId={currentUserId}
                          onClose={handleCloseInfo}
                          onLeftChannel={handleCloseInfo}
                          onArchived={handleCloseInfo}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {isPanelNarrow && (
                    <Sheet open={showInfoPanel} onOpenChange={setShowInfoPanel}>
                      <SheetContent className="flex w-full flex-col gap-0 overflow-hidden p-0">
                        <ChannelInfoPanel
                          channelId={channel.id}
                          currentUserId={currentUserId}
                          onClose={handleCloseInfo}
                          onLeftChannel={handleCloseInfo}
                          onArchived={handleCloseInfo}
                        />
                      </SheetContent>
                    </Sheet>
                  )}
                </div>
              </ChatAblyProvider>
            </div>
          ) : null}
        </PageState>
      </PmPageShell>
    </PageWrapper>
  );
}
