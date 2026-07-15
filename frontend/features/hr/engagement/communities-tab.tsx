"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Plus, Users, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { HrSheet } from "@/features/hr/hr-sheet";
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
          <Button
            size="sm"
            variant="outline"
            className="text-xs gap-1 px-2.5"
            onClick={handleLeave}
            disabled={leave.isPending}
          >
            <UserCheck className="h-3 w-3" />
            Joined
          </Button>
        ) : (
          <Button
            size="sm"
            className="text-xs px-2.5"
            onClick={handleJoin}
            disabled={join.isPending}
          >
            Join
          </Button>
        )}
      </div>
      <div className="space-y-0.5">
        <p className="text-sm font-semibold text-foreground leading-tight">{community.name}</p>
        {community.description && (
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
            {community.description}
          </p>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground">
        {memberCount} {memberCount === 1 ? "member" : "members"}
      </p>
    </div>
  );
}

export function CommunitiesTab({ currentUserId }: { currentUserId: string }) {
  const { data: communities, isLoading } = useEngagementCommunities();
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

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" className="gap-1.5" onClick={() => setSheetOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          New Community
        </Button>
      </div>

      {(!communities || communities.length === 0) ? (
        <div className="flex flex-col items-center justify-center py-16 rounded-lg border border-dashed border-border bg-muted/20">
          <Users className="w-8 text-muted-foreground mb-3" />
          <p className="text-sm font-medium text-foreground">No communities yet</p>
          <p className="text-xs text-muted-foreground mt-1">Create a community to bring people together</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {communities.map((c) => (
            <CommunityCard key={c.id} community={c} currentUserId={currentUserId} />
          ))}
        </div>
      )}

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
