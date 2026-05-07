"use client";

import { useSession } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Plus, Loader2, X } from "lucide-react";
import { resolveImageUrl } from "@/lib/utils";
import {
  useWatchers,
  useToggleWatch,
  useAddWatcher,
  useRemoveWatcher,
} from "@/lib/api/hooks/projects";
import { getApiError } from "@/lib/api-client";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ProjectMember } from "./types";

interface WatcherListProps {
  projectId: number;
  ticketId: number;
  members: ProjectMember[];
  /** When true, current user may remove watchers other than themselves (server enforces too). */
  canRemoveOtherWatchers?: boolean;
}

export function WatcherList({
  projectId,
  ticketId,
  members,
  canRemoveOtherWatchers = false,
}: WatcherListProps) {
  const { data: session } = useSession();
  const { data: watchers = [], isLoading } = useWatchers(projectId, ticketId);
  const toggleWatch = useToggleWatch(projectId);
  const addWatcher = useAddWatcher(projectId);
  const removeWatcher = useRemoveWatcher(projectId);

  const currentUserId = session?.user?.id;
  const isWatching = watchers.some((w) => w.userId === currentUserId);
  const watcherUserIds = new Set(watchers.map((w) => w.userId));

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
          onClick={() =>
            toggleWatch.mutate({ ticketId, watching: isWatching })
          }
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
        <div className="flex flex-wrap gap-1.5">
          {watchers.map((w) => {
            const canRemove =
              w.userId === currentUserId || canRemoveOtherWatchers;
            return (
              <div
                key={w.userId}
                className="relative group inline-flex"
                title={
                  [w.user?.firstName, w.user?.lastName].filter(Boolean).join(" ") ||
                  w.userId
                }
              >
                <Avatar className="h-6 w-6">
                  <AvatarImage src={resolveImageUrl(w.user?.image)} />
                  <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                    {w.user?.firstName?.[0]}
                    {w.user?.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                {canRemove && (
                  <button
                    type="button"
                    aria-label="Remove watcher"
                    className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full border border-background bg-muted text-muted-foreground opacity-0 shadow-sm transition-opacity hover:bg-destructive hover:text-destructive-foreground group-hover:opacity-100 focus:opacity-100"
                    disabled={removeWatcher.isPending}
                    onClick={() =>
                      removeWatcher.mutate(
                        { ticketId, userId: w.userId },
                        {
                          onError: (e) =>
                            toast.error(getApiError(e)),
                        }
                      )
                    }
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Select
        value=""
        onValueChange={(userId) => {
          if (!userId) return;
          addWatcher.mutate({ ticketId, userId });
        }}
      >
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
                  <span className="text-xs">{m.firstName ?? m.name}</span>
                </div>
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
    </div>
  );
}
