"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useCreateEntityChannel, useEntityChannel } from "@/hooks/api/chat-entities";
import { useCan } from "@/hooks/api/access";
import { getErrorMessage } from "@/lib/get-error-message";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { ChatAblyProvider } from "./ably-provider";
import { MessagePanel } from "./message-panel";
import { useChatOutboxDrain } from "./use-chat-offline-queue";
import { ChannelInfoPanel } from "./channel-info-panel";
import { useIsChatPanelNarrow } from "./use-chat-mobile";
import { useMobilePanelBack } from "./use-mobile-panel-back";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { PM_PANEL_SOLID, PmPageShell } from "@/components/pm-chrome";

interface RecordConversationPageProps {
  entityType: string;
  entityId: string;
  title?: string;
  subtitle?: string;
  emptyTitle?: string;
  emptyDescriptionWrite?: string;
  emptyDescriptionReadOnly?: string;
}

const noop = () => {};

export function RecordConversationPage({
  entityType,
  entityId,
  title = "Chat",
  subtitle = "The conversation for this record",
  emptyTitle = "No chat channel linked",
  emptyDescriptionWrite = "This record does not have an associated chat channel yet. Create one to start the conversation.",
  emptyDescriptionReadOnly = "This record does not have an associated chat channel yet. Ask an admin to link one.",
}: RecordConversationPageProps) {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id ?? "";
  useChatOutboxDrain();
  const { data: channel, error, isLoading, isError, refetch } = useEntityChannel(
    entityType,
    entityId,
  );
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const isPanelNarrow = useIsChatPanelNarrow();
  const canCreateChannel = useCan("chat:channels:write");
  const createEntityChannel = useCreateEntityChannel();

  const pageState = usePageState({
    permission: "chat:channels:read",
    isLoading,
    isError,
    error,
    isEmpty: !isLoading && !error && !channel?.id,
  });

  function handleToggleInfo() {
    setShowInfoPanel((open) => !open);
  }

  function handleCloseInfo() {
    setShowInfoPanel(false);
  }

  useMobilePanelBack(showInfoPanel, handleCloseInfo);

  function handleRetry() {
    void refetch();
  }

  function handleCreateChannel() {
    createEntityChannel.mutate(
      { entityType, entityId },
      {
        onSuccess: () => {
          toast.success("Chat channel created");
        },
        onError: (mutationError) => {
          toast.error(getErrorMessage(mutationError));
        },
      },
    );
  }

  const emptyContent = (
    <EmptyState
      className="flex-1"
      illustrationPreset="chat"
      title={emptyTitle}
      description={canCreateChannel ? emptyDescriptionWrite : emptyDescriptionReadOnly}
      action={
        canCreateChannel
          ? {
              label: createEntityChannel.isPending ? "Creating channel…" : "Create chat channel",
              onClick: handleCreateChannel,
            }
          : undefined
      }
    />
  );

  return (
    <PageWrapper noInternalScroll title={title} subtitle={subtitle}>
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
                      key={channel.id}
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
                      <SheetContent
                        showCloseButton={false}
                        className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md"
                      >
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
