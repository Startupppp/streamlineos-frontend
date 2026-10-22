"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { LoadingButton } from "@/components/ui/loading-button";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import { useJoinChannel } from "@/hooks/api/chat-core-mutations-b";

interface ChannelJoinStateProps {
  channelId: number;
  channelName: string | null;
}

export function ChannelJoinState({ channelId, channelName }: ChannelJoinStateProps) {
  const joinChannel = useJoinChannel();
  const canJoin = useCan("chat:channels:write");
  const label = channelName ? `#${channelName}` : "this channel";

  const handleJoin = useCallback(() => {
    joinChannel.mutate(channelId, {
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }, [joinChannel, channelId]);

  return (
    <div className="flex-1 min-h-0 min-w-0 flex flex-col items-center justify-center gap-3 p-4 text-center">
      <p className="text-sm font-semibold">You haven&apos;t joined {label} yet</p>
      <p className="text-dense text-muted-foreground max-w-sm">
        {canJoin
          ? "Join the channel to read its messages and reply."
          : "You don't have permission to join channels. Ask a workspace admin to add you."}
      </p>
      {canJoin && (
        <LoadingButton size="sm" isPending={joinChannel.isPending} onClick={handleJoin}>
          Join {label}
        </LoadingButton>
      )}
    </div>
  );
}
