"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
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

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
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
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      <div className="px-6 pt-5 pb-3 border-b border-border/30">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-[16px] font-bold">Channels</h1>
            <p className="text-[12px] text-muted-foreground">
              Browse and join public channels in your organization. Your direct messages and
              private channels live under Discuss.
            </p>
          </div>
          <Button size="sm" className="h-8 gap-1.5 shrink-0" onClick={handleOpenCreate}>
            <Plus className="h-3.5 w-3.5" />
            Create Channel
          </Button>
        </div>
        <div className="relative mt-3 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
          <Input
            placeholder="Search channels..."
            value={search}
            onChange={handleSearchChange}
            className="pl-9 h-8 bg-muted/30 border-border/30"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3 py-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-3 w-44" />
                </div>
                <Skeleton className="h-7 w-14 rounded-md" />
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
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handlePrevPage}
                  disabled={currentPage === 0}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleNextPage}
                  disabled={currentPage >= totalPages - 1}
                  aria-label="Next page"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <NewGroupDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={handleSelect}
        hideTrigger
      />
    </div>
  );
}
