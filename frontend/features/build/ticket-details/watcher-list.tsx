"use client";

import { useCallback } from "react";
import { useSession } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { EyeIcon, EyeOffIcon } from "@animateicons/react/lucide";
import { resolveImageUrl } from "@/lib/utils";
import { MemberPicker } from "@/components/members/member-picker";
import { useWatchers, useToggleWatch, useAddWatcher } from "@/hooks/api/build";
import { getUserDisplayName, getUserInitials } from "@/lib/person-display";
import { useCan } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageState } from "@/components/shared/page-state";

interface WatcherListProps {
  projectId: number;
  ticketId: number;
}

export function WatcherList({ projectId, ticketId }: WatcherListProps) {
  const canUpdate = useCan("build:tickets:update");
  const { iconRef: watchIconRef, hoverHandlers: watchHoverHandlers } =
    useAnimatedIcon();
  const { data: session } = useSession();
  const {
    data: watchers = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useWatchers(projectId, ticketId);
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

  const handleRetry = useCallback(() => void refetch(), [refetch]);

  const resolution = usePageState({ isLoading, isError, error });

  const loadingSkeleton = (
    <div className="space-y-2">
      <Skeleton className="h-3 w-16" />
      <div className="flex gap-1">
        <Skeleton className="h-6 w-6 rounded-full" />
        <Skeleton className="h-6 w-6 rounded-full" />
      </div>
    </div>
  );

  return (
    <PageState
      resolution={resolution}
      loading={loadingSkeleton}
      onRetry={handleRetry}
      compact
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1">
            <Eye className="h-3 w-3" /> Watchers
          </label>
          {canUpdate ? (
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
                  <EyeOffIcon ref={watchIconRef} size={12} className="mr-1" />{" "}
                  Unwatch
                </>
              ) : (
                <>
                  <EyeIcon ref={watchIconRef} size={12} className="mr-1" />{" "}
                  Watch
                </>
              )}
            </Button>
          ) : null}
        </div>

        {watchers.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No one is watching this ticket yet.
          </p>
        ) : null}

        {watchers.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {watchers.map((w) => (
              <Avatar
                key={w.userId}
                className="h-6 w-6"
                title={getUserDisplayName(w.user)}
              >
                <AvatarImage src={resolveImageUrl(w.user?.image)} />
                <AvatarFallback className="text-micro bg-primary/10 text-primary">
                  {getUserInitials(w.user)}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
        )}

        {canUpdate ? (
          <MemberPicker
            projectId={projectId}
            value=""
            onChange={handleAddWatcher}
            placeholder="+ Add watcher"
          />
        ) : null}
      </div>
    </PageState>
  );
}
