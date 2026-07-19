"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
} from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { SearchInput } from "@/components/ui/search-input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import { usePublicChannels, useJoinChannel, useLeaveChannel } from "@/hooks/api";
import { PublicChannelRow } from "./public-channel-row";
import { NewGroupDialog } from "./new-group-dialog";

const PAGE_SIZE = 10;

export function ChannelsDiscoveryPage() {
  const router = useRouter();
  const { data: publicChannels, isLoading } = usePublicChannels(true);
  const joinChannel = useJoinChannel();
  const leaveChannel = useLeaveChannel();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [joiningId, setJoiningId] = useState<number | null>(null);
  const [leavingId, setLeavingId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(0);
  }, []);

  const filtered = useMemo(() => {
    if (!publicChannels) return [];
    if (!search) return publicChannels;
    const q = search.toLowerCase();
    return publicChannels.filter(
      (ch) => ch.name.toLowerCase().includes(q) || ch.description?.toLowerCase().includes(q),
    );
  }, [publicChannels, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const paged = filtered.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);
  const rangeStart = filtered.length === 0 ? 0 : currentPage * PAGE_SIZE + 1;
  const rangeEnd = Math.min(filtered.length, currentPage * PAGE_SIZE + PAGE_SIZE);

  const handlePrevPage = useCallback(() => setPage((p) => Math.max(0, p - 1)), []);
  const handleNextPage = useCallback(
    () => setPage((p) => Math.min(totalPages - 1, p + 1)),
    [totalPages],
  );

  const handleJoin = useCallback(
    async (channelId: number) => {
      setJoiningId(channelId);
      try {
        await joinChannel.mutateAsync(channelId);
        toast.success("Joined channel");
      } catch (error) {
        toast.error(getErrorMessage(error));
      } finally {
        setJoiningId(null);
      }
    },
    [joinChannel],
  );

  const handleLeave = useCallback(
    async (channelId: number) => {
      setLeavingId(channelId);
      try {
        await leaveChannel.mutateAsync(channelId);
        toast.success("Left channel");
      } catch (error) {
        toast.error(getErrorMessage(error));
      } finally {
        setLeavingId(null);
      }
    },
    [leaveChannel],
  );

  const handleSelect = useCallback(
    (channelId: number) => router.push(`/chat?channel=${channelId}`),
    [router],
  );
  const handleOpenCreate = useCallback(() => setCreateOpen(true), []);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background">
      <div className="border-b border-border/30 px-4 pb-3 pt-5 sm:px-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-[16px] font-bold">Channels</h1>
            <p className="text-[12px] text-muted-foreground">
              Public channels for your org. DMs and private chats are in Discuss.
            </p>
          </div>
          <AnimatedIconButton
            icon={PlusIcon}
            iconSize={14}
            iconClassName="mr-0"
            size="sm"
            className="gap-1.5 shrink-0"
            onClick={handleOpenCreate}
          >
            Create Channel
          </AnimatedIconButton>
        </div>
        <div className="mt-3 w-full min-w-0 max-w-none bg-muted/30 border-border/30 sm:max-w-sm">
          <SearchInput placeholder="Search channels..." value={search} onValueChange={handleSearchChange} />
        </div>
      </div>

      <ScrollArea fill hideScrollbar className="min-h-0 flex-1">
        <div className="overscroll-contain px-4 py-4 pb-[calc(4rem+env(safe-area-inset-bottom))] sm:px-6 md:pb-4">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3 py-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-3 w-44" />
                </div>
                <Skeleton className="h-8 w-14 rounded-md" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            illustrationPreset={search ? "search" : "chat"}
            title={search ? "No channels match your search" : "No public channels yet"}
            description={
              search
                ? "Try a different search term"
                : "Create a public channel to get started"
            }
            action={
              search ? undefined : { label: "Create Channel", onClick: handleOpenCreate }
            }
            className={CONTENT_FILL_PANEL}
          />
        ) : (
          <div>
            <div className="grid gap-2 sm:grid-cols-2">
              {paged.map((ch) => (
                <div key={ch.id} className="border border-border/40 rounded-xl">
                  <PublicChannelRow
                    channel={ch}
                    onJoin={handleJoin}
                    onLeave={handleLeave}
                    joiningId={joiningId}
                    leavingId={leavingId}
                    onSelect={handleSelect}
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 mt-4 text-[12px] text-muted-foreground">
              <span>
                {rangeStart}-{rangeEnd} / {filtered.length}
              </span>
              <div className="flex items-center gap-1">
                <AnimatedIconButton
                  icon={ChevronLeftIcon}
                  iconSize={14}
                  type="button"
                  variant="outline"
                  size="icon"
                  className="w-7"
                  onClick={handlePrevPage}
                  disabled={currentPage === 0}
                  aria-label="Previous page"
                />
                <AnimatedIconButton
                  icon={ChevronRightIcon}
                  iconSize={14}
                  type="button"
                  variant="outline"
                  size="icon"
                  className="w-7"
                  onClick={handleNextPage}
                  disabled={currentPage >= totalPages - 1}
                  aria-label="Next page"
                />
              </div>
            </div>
          </div>
        )}
        </div>
      </ScrollArea>

      <NewGroupDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={handleSelect}
        hideTrigger
      />
    </div>
  );
}
