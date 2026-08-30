"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { SavedMessagesPanel } from "./saved-messages-panel";
import { SharedFilesPanel } from "./shared-files-panel";
import { ForwardMessageDialog } from "./forward-message-dialog";
import type { ForwardableMessage } from "./forward-message-dialog";

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
            <SharedFilesPanel
              channelId={channelId}
              onClose={() => setShowFilesPanel(false)}
            />
          </SheetContent>
        </Sheet>
      )}

      <ForwardMessageDialog
        message={forwardMessage}
        open={Boolean(forwardMessage)}
        onOpenChange={(open) => {
          if (!open) setForwardMessage(null);
        }}
      />
    </>
  );
}
