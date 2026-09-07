"use client";

import { useCallback, useState } from "react";
import { useSession } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useEntityChannel } from "@/hooks/api/chat";
import { isApiError } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/get-error-message";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { ChatAblyProvider } from "./ably-provider";
import { MessagePanel } from "./message-panel";
import { ChannelInfoPanel } from "./channel-info-panel";
import { useIsChatMobile } from "./use-chat-mobile";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { PM_PANEL_SOLID, PmPageShell } from "@/components/pm-chrome";

interface ProjectChatPageProps {
  projectId: string;
}

const noop = () => {};

export function BuildProjectChatPage({ projectId }: ProjectChatPageProps) {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id ?? "";
  const { data: channel, error, isLoading, refetch } = useEntityChannel(
    "project",
    projectId,
  );
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const isChatMobile = useIsChatMobile();

  const handleToggleInfo = useCallback(() => {
    setShowInfoPanel((open) => !open);
  }, []);

  const handleCloseInfo = useCallback(() => {
    setShowInfoPanel(false);
  }, []);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const isNotFound = isApiError(error) && error.status === 404;

  if (isLoading) {
    return null;
  }

  if (isNotFound || (!isLoading && !error && !channel)) {
    return (
      <PageWrapper noInternalScroll>
        <PmPageShell>
          <EmptyState
            className="flex-1"
            illustrationPreset="chat"
            title="No chat channel linked"
            description="This project does not have an associated chat channel yet. Ask a project admin to link one from the project settings."
          />
        </PmPageShell>
      </PageWrapper>
    );
  }

  if (error) {
    return (
      <PageWrapper noInternalScroll>
        <PmPageShell>
          <ErrorState
            className="flex-1"
            title="Couldn't load project chat"
            description={getErrorMessage(error)}
            onRetry={handleRetry}
          />
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
                {showInfoPanel && (
                  <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 320, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                    className="hidden lg:flex shrink-0 flex-col overflow-hidden border-l border-border/40 bg-card/50"
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
              {isChatMobile && (
                <Sheet open={showInfoPanel} onOpenChange={setShowInfoPanel}>
                  <SheetContent className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:hidden">
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
      </PmPageShell>
    </PageWrapper>
  );
}
