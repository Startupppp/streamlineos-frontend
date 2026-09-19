import {
  ChevronLeftIcon,
  MessageCircleIcon,
  PlusIcon,
  Trash2Icon,
  XIcon,
} from "@animateicons/react/lucide";
import { AnimatedLogo } from "@/components/brand/animated-logo";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";

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
    <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/70 px-3 py-2">
      {isConversations ? (
        <div className="flex min-w-0 items-center gap-1">
          <AnimatedIconButton
            type="button"
            icon={ChevronLeftIcon}
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            aria-label="Back to chat"
            onClick={onBackToChat}
          />
          <p className="text-sm font-semibold tracking-tight text-foreground">
            Conversations
          </p>
        </div>
      ) : (
        <div className="flex min-w-0 items-center gap-2">
          <AnimatedLogo size={22} gradient className="shrink-0 rounded-full" />
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-none tracking-tight text-foreground">
              Ask OS
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Your organization assistant
            </p>
          </div>
        </div>
      )}
      <div className="flex shrink-0 items-center">
        {!isConversations && (
          <>
            <AnimatedIconButton
              type="button"
              icon={MessageCircleIcon}
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              aria-label="View conversations"
              title="Conversations"
              onClick={onOpenConversations}
            />
            {activeConversationId !== null && (
              <AnimatedIconButton
                type="button"
                icon={PlusIcon}
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                aria-label="New chat"
                onClick={onNewChat}
              />
            )}
            {activeConversationId !== null && (
              <AnimatedIconButton
                type="button"
                icon={Trash2Icon}
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                aria-label="Delete conversation"
                disabled={isStreaming || deletePending}
                onClick={onDeleteActive}
              />
            )}
          </>
        )}
        <AnimatedIconButton
          type="button"
          icon={XIcon}
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          aria-label="Close"
          onClick={onClose}
        />
      </div>
    </div>
  );
}
