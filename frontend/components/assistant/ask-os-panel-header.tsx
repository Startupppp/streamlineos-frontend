import { ArrowLeft, Clock, PenLine, Trash2, X } from "lucide-react";
import { AnimatedLogo } from "@/components/brand/animated-logo";
import { cn } from "@/lib/utils";

interface AskOsPanelHeaderProps {
  activeConversationId: number | null;
  deletePending: boolean;
  isConversations: boolean;
  isStreaming: boolean;
  onBackToChat: () => void;
  onClose: () => void;
  onDeleteActive: () => void;
  onNewChat: () => void;
  onOpenConversations: () => void;
}

const buttonClassName =
  "rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted";

export function AskOsPanelHeader({
  activeConversationId,
  deletePending,
  isConversations,
  isStreaming,
  onBackToChat,
  onClose,
  onDeleteActive,
  onNewChat,
  onOpenConversations,
}: AskOsPanelHeaderProps) {
  return (
    <div className="flex shrink-0 items-center justify-between border-b border-border bg-muted/40 px-4 py-3">
      {isConversations ? (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBackToChat}
            aria-label="Back to chat"
            className={buttonClassName}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <p className="text-sm font-semibold leading-none text-foreground">
            Conversations
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <AnimatedLogo size={32} gradient className="rounded-full" />
          <div>
            <p className="text-sm font-semibold leading-none text-foreground">
              Ask OS
            </p>
            <p className="mt-0.5 text-micro text-muted-foreground">
              Your organization assistant
            </p>
          </div>
        </div>
      )}
      <div className="flex items-center gap-1">
        {!isConversations && (
          <>
            <button
              type="button"
              onClick={onOpenConversations}
              aria-label="View conversations"
              title="Conversations"
              className={buttonClassName}
            >
              <Clock className="h-4 w-4" />
            </button>
            {activeConversationId !== null && (
              <button
                type="button"
                onClick={onNewChat}
                aria-label="New chat"
                className={buttonClassName}
              >
                <PenLine className="h-4 w-4" />
              </button>
            )}
            {activeConversationId !== null && (
              <button
                type="button"
                onClick={onDeleteActive}
                disabled={isStreaming || deletePending}
                aria-label="Delete conversation"
                className={cn(buttonClassName, "disabled:opacity-50")}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </>
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className={buttonClassName}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
