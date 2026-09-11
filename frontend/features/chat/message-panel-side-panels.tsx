"use client";

import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { ChatOverlayFallback, ChatPanelFallback } from "./chat-lazy-fallbacks";
import type { ForwardableMessage } from "./forward-message-dialog";

const SavedMessagesPanel = dynamic(
  () =>
    import("./saved-messages-panel").then((m) => ({
      default: m.SavedMessagesPanel,
    })),
  { ssr: false, loading: () => <ChatPanelFallback label="Loading saved messages" /> },
);

const SharedFilesPanel = dynamic(
  () =>
    import("./shared-files-panel").then((m) => ({
      default: m.SharedFilesPanel,
    })),
  { ssr: false, loading: () => <ChatPanelFallback label="Loading shared files" /> },
);

const ForwardMessageDialog = dynamic(
  () =>
    import("./forward-message-dialog").then((m) => ({
      default: m.ForwardMessageDialog,
    })),
  { ssr: false, loading: () => <ChatOverlayFallback label="Loading forward message" /> },
);

type SidePanelsProps = {
  channelId: number;
  isChatMobile: boolean;
  showSavedPanel: boolean;
  setShowSavedPanel: (open: boolean) => void;
  showFilesPanel: boolean;
  setShowFilesPanel: (open: boolean) => void;
  forwardMessage: ForwardableMessage | null;
  setForwardMessage: (message: ForwardableMessage | null) => void;
};

const panelMotion = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
  transition: { duration: 0.2, ease: "easeInOut" as const },
  className: "hidden lg:flex w-80 flex-col overflow-hidden shrink-0",
};

export function MessagePanelSidePanels({
  channelId,
  isChatMobile,
  showSavedPanel,
  setShowSavedPanel,
  showFilesPanel,
  setShowFilesPanel,
  forwardMessage,
  setForwardMessage,
}: SidePanelsProps) {
  return (
    <>
      <AnimatePresence>
        {showSavedPanel && (
          <motion.div {...panelMotion}>
            <SavedMessagesPanel
              onClose={() => setShowSavedPanel(false)}
              onJumpToChannel={() => setShowSavedPanel(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {isChatMobile && (
        <Sheet open={showSavedPanel} onOpenChange={setShowSavedPanel}>
          <SheetContent className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:hidden">
            <SheetTitle className="sr-only">Saved messages</SheetTitle>
            <SavedMessagesPanel
              onClose={() => setShowSavedPanel(false)}
              onJumpToChannel={() => setShowSavedPanel(false)}
            />
          </SheetContent>
        </Sheet>
      )}

      <AnimatePresence>
        {showFilesPanel && (
          <motion.div {...panelMotion}>
            <SharedFilesPanel
              channelId={channelId}
              onClose={() => setShowFilesPanel(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {isChatMobile && (
        <Sheet open={showFilesPanel} onOpenChange={setShowFilesPanel}>
          <SheetContent className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:hidden">
            <SheetTitle className="sr-only">Shared files</SheetTitle>
            <SharedFilesPanel
              channelId={channelId}
              onClose={() => setShowFilesPanel(false)}
            />
          </SheetContent>
        </Sheet>
      )}

      {forwardMessage !== null && (
        <ForwardMessageDialog
          message={forwardMessage}
          open
          onOpenChange={(open) => {
            if (!open) setForwardMessage(null);
          }}
        />
      )}
    </>
  );
}
