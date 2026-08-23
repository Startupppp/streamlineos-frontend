"use client";

import { useCallback } from "react";
import { useSession } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Eye, Loader2 } from "lucide-react";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { EyeIcon, EyeOffIcon } from "@animateicons/react/lucide";
import { resolveImageUrl } from "@/lib/utils";
import { MemberPicker } from "@/components/members/member-picker";
import { useWatchers, useToggleWatch, useAddWatcher } from "@/hooks/api/build";
import { getUserDisplayName, getUserInitials } from "@/lib/person-display";

interface WatcherListProps {
  projectId: number;
  ticketId: number;
}

export function WatcherList({ projectId, ticketId }: WatcherListProps) {
  const { iconRef: watchIconRef, hoverHandlers: watchHoverHandlers } = useAnimatedIcon();
  const { data: session } = useSession();
  const { data: watchers = [], isLoading } = useWatchers(projectId, ticketId);
  const toggleWatch = useToggleWatch(projectId);
  const addWatcher = useAddWatcher(projectId);

  const currentUserId = session?.user?.id;
  const isWatching = watchers.some((w) => w.userId === currentUserId);

  const handleToggleWatch = useCallback(() => {
    toggleWatch.mutate({ ticketId, watching: isWatching });
  }, [toggleWatch, ticketId, isWatching]);

  const handleAddWatcher = useCallback(
    (userId: string | null) => {
      if (!userId) return;
      if (watchers.some((w) => w.userId === userId)) return;
      addWatcher.mutate({ ticketId, userId });
    },
    [addWatcher, ticketId, watchers],
  );

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        Loading watchers...
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1">
          <Eye className="h-3 w-3" /> Watchers
        </label>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={handleToggleWatch}
          disabled={toggleWatch.isPending}
          {...watchHoverHandlers}
        >
          {isWatching ? (
            <>
              <EyeOffIcon ref={watchIconRef} size={12} className="mr-1" /> Unwatch
            </>
          ) : (
            <>
              <EyeIcon ref={watchIconRef} size={12} className="mr-1" /> Watch
            </>
          )}
        </Button>
      </div>

      {watchers.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {watchers.map((w) => (
            <Avatar key={w.userId} className="h-6 w-6" title={getUserDisplayName(w.user)}>
              <AvatarImage src={resolveImageUrl(w.user?.image)} />
              <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                {getUserInitials(w.user)}
              </AvatarFallback>
            </Avatar>
          ))}
        </div>
      )}

      <MemberPicker
        projectId={projectId}
        value=""
        onChange={handleAddWatcher}
        placeholder="+ Add watcher"
      />
    </div>
  );
}
