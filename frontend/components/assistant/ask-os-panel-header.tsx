import {
  ChevronLeftIcon,
  MessageCircleIcon,
  PlusIcon,
  Trash2Icon,
  XIcon,
} from "@animateicons/react/lucide";
import { Maximize2, Minimize2 } from "lucide-react";
import { AnimatedLogo } from "@/components/brand/animated-logo";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";

interface AskOsPanelHeaderProps {
  activeConversationId: number | null;
  deletePending: boolean;
  isConversations: boolean;
  isStreaming: boolean;
  expanded: boolean;
  showExpand: boolean;
  onToggleExpanded: () => void;
  onBackToChat: () => void;
  onClose: () => void;
  onDeleteActive: () => void;
  onNewChat: () => void;
  onOpenConversations: () => void;
}

function ExpandToggleButton({
  expanded,
  onToggle,
}: {
  expanded: boolean;
  onToggle: () => void;
}) {
  const Icon = expanded ? Minimize2 : Maximize2;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={expanded}
      aria-label={expanded ? "Exit full screen" : "Expand Ask OS"}
      title={expanded ? "Exit full screen" : "Full screen"}
      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

export function AskOsPanelHeader({
  activeConversationId,
  deletePending,
  isConversations,
  isStreaming,
  expanded,
  showExpand,
  onToggleExpanded,
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
        {showExpand ? (
          <ExpandToggleButton expanded={expanded} onToggle={onToggleExpanded} />
        ) : null}
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
