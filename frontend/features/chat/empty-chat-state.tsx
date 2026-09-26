"use client";

import { ChatIllustration } from "@/components/illustrations";
import { EmptyState } from "@/components/ui/empty-state";

export function EmptyChatState({
  onNewDM,
  onNewChannel,
  onSearch,
}: {
  onNewDM: () => void;
  onNewChannel: () => void;
  onSearch: () => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <EmptyState
        illustration={<ChatIllustration className="h-full w-full" />}
        title="Welcome to Chat"
        description="Select a conversation, or start a direct message or a channel."
        action={{ label: "New direct message", onClick: onNewDM }}
        secondaryAction={{ label: "New channel", onClick: onNewChannel }}
        tertiaryAction={{ label: "Search messages", onClick: onSearch }}
        className="min-h-0 flex-1 border-0 bg-transparent px-6 shadow-none"
      />
    </div>
  );
}
