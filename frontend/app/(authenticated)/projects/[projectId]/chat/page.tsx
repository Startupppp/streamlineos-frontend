"use client";

import { use, useCallback, useState } from "react";
import { useSession } from "next-auth/react";
import { MessageCircle } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useEntityChannel } from "@/hooks/api/chat";
import { isApiError } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/get-error-message";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PmPageShell, PmPanel } from "@/features/projects/shared/pm-chrome";
import { ChatAblyProvider } from "@/features/chat/ably-provider";
import { MessagePanel } from "@/features/chat/message-panel";
import { ChannelInfoPanel } from "@/features/chat/channel-info-panel";
import { useIsChatMobile } from "@/features/chat/use-chat-mobile";
import { Sheet, SheetContent } from "@/components/ui/sheet";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

const noop = () => {};

export default function ProjectChatRoute({ params }: PageProps) {
  const { projectId } = use(params);
  const { data: session } = useSession();
  const currentUserId = session?.user?.id ?? "";
  const { data: channel, error, isLoading } = useEntityChannel("project", projectId);
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const isChatMobile = useIsChatMobile();

  const handleToggleInfo = useCallback(() => {
    setShowInfoPanel((open) => !open);
  }, []);

  const handleCloseInfo = useCallback(() => {
    setShowInfoPanel(false);
  }, []);

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
        </PmPanel>
      </PmPageShell>
    </PageWrapper>
  );
}
