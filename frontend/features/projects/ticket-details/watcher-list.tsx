"use client";

import { useSession } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Plus, Loader2 } from "lucide-react";
import { resolveImageUrl } from "@/lib/utils";
import { useWatchers, useToggleWatch, useAddWatcher } from "@/hooks/api/projects";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ProjectMember } from "./types";
import { getUserDisplayName, getUserInitials } from "@/features/projects/shared/resolve-user-name";

interface WatcherListProps {
  projectId: number;
  ticketId: number;
  members: ProjectMember[];
}

export function WatcherList({ projectId, ticketId, members }: WatcherListProps) {
  const { data: session } = useSession();
  const { data: watchers = [], isLoading } = useWatchers(projectId, ticketId);
  const toggleWatch = useToggleWatch(projectId);
  const addWatcher = useAddWatcher(projectId);

  const currentUserId = session?.user?.id;
  const isWatching = watchers.some((w) => w.userId === currentUserId);
  const watcherUserIds = new Set(watchers.map((w) => w.userId));

  const handleToggleWatch = () => {
    toggleWatch.mutate({ ticketId, watching: isWatching });
  };

  const handleAddWatcher = (userId: string) => {
    if (!userId) return;
    addWatcher.mutate({ ticketId, userId });
  };

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
        >
          {isWatching ? (
            <>
              <EyeOff className="h-3 w-3 mr-1" /> Unwatch
            </>
          ) : (
            <>
              <Eye className="h-3 w-3 mr-1" /> Watch
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

      <Select value="" onValueChange={handleAddWatcher}>
        <SelectTrigger className="h-7 text-xs bg-background">
          <SelectValue placeholder="+ Add watcher" />
        </SelectTrigger>
        <SelectContent>
          {members
            .filter((m) => !watcherUserIds.has(m.id))
            .map((m) => (
              <SelectItem key={m.id} value={m.id}>
                <div className="flex items-center gap-2">
                  <Plus className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs">{getUserDisplayName(m)}</span>
                </div>
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
    </div>
  );
}
