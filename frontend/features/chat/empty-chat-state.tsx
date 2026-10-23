"use client";

import { ChatIllustration } from "@/components/illustrations";
import { Button } from "@/components/ui/button";
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
    <div className="flex h-full min-h-0 flex-col items-center justify-center px-6 py-8">
      <EmptyState
        bare
        illustration={<ChatIllustration className="h-44 w-44" />}
        title="Choose a conversation"
        description="Pick someone from the list, or start fresh with a message or channel."
        className="min-h-0 w-full max-w-md border-0 bg-transparent px-0 shadow-none"
      />
      <div className="mt-6 flex w-full max-w-md flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-center">
        <Button type="button" onClick={onNewDM} className="sm:min-w-36">
          New message
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onNewChannel}
          className="sm:min-w-36"
        >
          New channel
        </Button>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onSearch}
        className="mt-3 text-muted-foreground hover:text-foreground"
      >
        Search conversations
      </Button>
    </div>
  );
}
