"use client";

import type { RefObject } from "react";
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

const ForwardMessageDialog = dynamic(
  () =>
    import("./forward-message-dialog").then((m) => ({
      default: m.ForwardMessageDialog,
    })),
  { ssr: false, loading: () => <ChatOverlayFallback label="Loading forward message" /> },
);

type SidePanelsProps = {
  isPanelNarrow: boolean;
  showSavedPanel: boolean;
  setShowSavedPanel: (open: boolean) => void;
  forwardMessage: ForwardableMessage | null;
  setForwardMessage: (message: ForwardableMessage | null) => void;
  dropdownTriggerRef?: RefObject<HTMLButtonElement | null>;
};

const panelMotion = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
  transition: { duration: 0.2, ease: "easeInOut" as const },
  className:
    "flex w-80 shrink-0 flex-col overflow-hidden border-l border-border/40",
};

export function MessagePanelSidePanels({
  isPanelNarrow,
  showSavedPanel,
  setShowSavedPanel,
  forwardMessage,
  setForwardMessage,
  dropdownTriggerRef,
}: SidePanelsProps) {
  const handleCloseSaved = () => setShowSavedPanel(false);

  function handleForwardOpenChange(open: boolean) {
    if (!open) setForwardMessage(null);
  }

  function handleCloseAutoFocus(event: Event) {
    if (!dropdownTriggerRef?.current) return;
    event.preventDefault();
    dropdownTriggerRef.current.focus();
  }

  return (
    <>
      <AnimatePresence>
        {!isPanelNarrow && showSavedPanel && (
          <motion.div {...panelMotion}>
            <SavedMessagesPanel
              onClose={handleCloseSaved}
              onJumped={handleCloseSaved}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {isPanelNarrow && (
        <Sheet open={showSavedPanel} onOpenChange={setShowSavedPanel}>
          <SheetContent showCloseButton={false} className="flex w-full flex-col gap-0 overflow-hidden p-0" onCloseAutoFocus={handleCloseAutoFocus}>
            <SheetTitle className="sr-only">Saved messages</SheetTitle>
            <SavedMessagesPanel
              onClose={handleCloseSaved}
              onJumped={handleCloseSaved}
            />
          </SheetContent>
        </Sheet>
      )}

      {forwardMessage !== null && (
        <ForwardMessageDialog
          message={forwardMessage}
          open
          onOpenChange={handleForwardOpenChange}
        />
      )}
    </>
  );
}
