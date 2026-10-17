"use client";

import { useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { Users, UserCheck } from "lucide-react";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { LoadingButton } from "@/components/ui/loading-button";
import { InfiniteScrollSentinel } from "@/components/ui/infinite-scroll-sentinel";
import { PlusIcon } from "@animateicons/react/lucide";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/ui/empty-state";
import { TruncatedText } from "@/components/ui/truncated-text";
import { ErrorState } from "@/components/shared/error-state";
import { HrSheet } from "@/components/shared/hr-sheet";
import {
  useEngagementCommunities,
  useCreateCommunity,
  useJoinCommunity,
  useLeaveCommunity,
  type HrCommunity,
} from "@/hooks/api/hr/engagement";
import { getErrorMessage } from "@/lib/get-error-message";

interface CommunityCardProps {
  community: HrCommunity;
  currentUserId: string;
}

function CommunityCard({ community, currentUserId }: CommunityCardProps) {
  const join = useJoinCommunity();
  const leave = useLeaveCommunity();

  const isMember = community.members.some((m) => m.userId === currentUserId);
  const memberCount = community.members.length;

  const handleJoin = useCallback(() => {
    toast.promise(join.mutateAsync(community.id), {
      loading: "Joining...",
      success: "Joined community!",
      error: getErrorMessage,
    });
  }, [community.id, join]);

  const handleLeave = useCallback(() => {
    toast.promise(leave.mutateAsync(community.id), {
      loading: "Leaving...",
      success: "Left community",
      error: getErrorMessage,
    });
  }, [community.id, leave]);

  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Users className="h-5 w-5 text-primary" />
        </div>
        {isMember ? (
          <LoadingButton
            size="sm"
            variant="outline"
            className="text-xs gap-1 px-2.5"
            onClick={handleLeave}
            isPending={leave.isPending}
          >
            <UserCheck className="h-3 w-3" />
            Joined
          </LoadingButton>
        ) : (
          <LoadingButton
            size="sm"
            className="text-xs px-2.5"
            onClick={handleJoin}
            isPending={join.isPending}
          >
            Join
          </LoadingButton>
        )}
      </div>
      <div className="space-y-0.5">
        <TruncatedText text={community.name} className="text-sm font-semibold text-foreground leading-tight" />
        {community.description && (
          <TruncatedText text={community.description} lines={2} className="text-xs text-muted-foreground leading-relaxed" />
        )}
      </div>
      <p className="text-dense text-muted-foreground">
        {memberCount} {memberCount === 1 ? "member" : "members"}
      </p>
    </div>
  );
}

export function CommunitiesTab({ currentUserId }: { currentUserId: string }) {
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useEngagementCommunities();
  const communities = useMemo(
    () => data?.pages.flatMap((page) => page.items) ?? [],
    [data],
  );
  const createCommunity = useCreateCommunity();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
  }, []);

  const handleDescriptionChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDescription(e.target.value);
  }, []);

  const handleReset = useCallback(() => {
    setName("");
    setDescription("");
  }, []);

  const handleSheetChange = useCallback(
    (open: boolean) => {
      if (!open) handleReset();
      setSheetOpen(open);
    },
    [handleReset],
  );

  const handleCreate = useCallback(() => {
    if (!name.trim()) { toast.error("Name is required"); return; }
    toast.promise(
      createCommunity.mutateAsync({ name, description: description || undefined }),
      {
        loading: "Creating community...",
        success: () => {
          setSheetOpen(false);
          handleReset();
          return "Community created!";
        },
        error: getErrorMessage,
      },
    );
  }, [name, description, createCommunity, handleReset]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
      </div>
    );
  }

  if (isError) {
    return <ErrorState className="flex-1" title="Couldn't load communities" description={getErrorMessage(error)} onRetry={() => void refetch()} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <AnimatedIconButton
          icon={PlusIcon}
          iconSize={14}
          iconClassName="mr-1.5"
          size="sm"
          className="gap-1.5"
          onClick={() => setSheetOpen(true)}
        >
          New Community
        </AnimatedIconButton>
      </div>

      {(!communities || communities.length === 0) ? (
        <EmptyState
          illustrationPreset="team"
          title="No communities yet"
          description="Create a community to bring people together"
          compact
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {communities.map((c) => (
            <CommunityCard key={c.id} community={c} currentUserId={currentUserId} />
          ))}
        </div>
      )}

      <InfiniteScrollSentinel
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        onLoadMore={fetchNextPage}
        label="Load more communities"
      />

      <HrSheet
        open={sheetOpen}
        onOpenChange={handleSheetChange}
        title="Create Community"
        description="Start a new employee community or interest group."
        onSubmit={handleCreate}
        submitLabel="Create Community"
        isPending={createCommunity.isPending}
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="comm-name" className="text-xs font-medium">Name</Label>
            <Input
              id="comm-name"
              placeholder="e.g. Book Club, Running Team"
              value={name}
              onChange={handleNameChange}
              className="text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="comm-desc" className="text-xs font-medium">Description (optional)</Label>
            <Textarea
              id="comm-desc"
              placeholder="What is this community about?"
              value={description}
              onChange={handleDescriptionChange}
              className="min-h-[80px] text-sm resize-none"
            />
          </div>
        </div>
      </HrSheet>
    </div>
  );
}
