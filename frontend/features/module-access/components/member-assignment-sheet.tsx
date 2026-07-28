"use client";

import { useState, useCallback } from "react";
import { X, UserPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingButton } from "@/components/ui/loading-button";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useModuleGroupMembers,
  useAddModuleGroupMember,
  useRemoveModuleGroupMember,
  useModuleMemberCandidates,
  type ModuleGroupMember,
} from "@/hooks/api/module-access";

interface MemberAssignmentSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleKey: string;
  groupId: number;
  groupName: string;
  canManage: boolean;
}

function getUserInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0] ?? "")
    .join("")
    .toUpperCase();
}

function MemberRow({
  member,
  onRemove,
  isPending,
}: {
  member: ModuleGroupMember;
  onRemove: (userId: string) => void;
  isPending: boolean;
}) {
  const handleRemove = useCallback(
    () => onRemove(member.userId),
    [member.userId, onRemove],
  );

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border/60 last:border-0">
      <Avatar className="h-7 w-7 shrink-0">
        <AvatarImage src={member.avatarUrl ?? undefined} />
        <AvatarFallback className="text-[10px]">
          {getUserInitials(member.displayName)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{member.displayName}</p>
        <p className="text-xs text-muted-foreground truncate">{member.email}</p>
      </div>
      <button
        type="button"
        onClick={handleRemove}
        disabled={isPending}
        className="inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors shrink-0"
        aria-label={`Remove ${member.displayName}`}
      >
        {isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <X className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  );
}

export function MemberAssignmentSheet({
  open,
  onOpenChange,
  moduleKey,
  groupId,
  groupName,
  canManage,
}: MemberAssignmentSheetProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [removingId, setRemovingId] = useState<string | null>(null);

  const membersQuery = useModuleGroupMembers(moduleKey, groupId);
  const candidatesQuery = useModuleMemberCandidates(moduleKey);
  const addMember = useAddModuleGroupMember(moduleKey);
  const removeMember = useRemoveModuleGroupMember(moduleKey);

  const members = membersQuery.data ?? [];
  const memberIds = new Set(members.map((m) => m.userId));
  const candidates = (candidatesQuery.data ?? []).filter(
    (c) => !memberIds.has(c.userId),
  );

  const handleAdd = useCallback(() => {
    if (!selectedUserId) return;
    addMember.mutate(
      { groupId, userId: selectedUserId },
      {
        onSuccess: () => {
          toast.success("Member added");
          setSelectedUserId("");
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }, [selectedUserId, groupId, addMember]);

  const handleRemove = useCallback(
    (userId: string) => {
      setRemovingId(userId);
      removeMember.mutate(
        { groupId, userId },
        {
          onSuccess: () => {
            toast.success("Member removed");
            setRemovingId(null);
          },
          onError: (err) => {
            toast.error(getErrorMessage(err));
            setRemovingId(null);
          },
        },
      );
    },
    [groupId, removeMember],
  );

  const handleSelectChange = useCallback(
    (val: string) => setSelectedUserId(val),
    [],
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="px-5 pt-5 pb-4 border-b border-border shrink-0">
          <SheetTitle className="text-base">
            Members — {groupName}
          </SheetTitle>
        </SheetHeader>

        {canManage && (
          <div className="px-5 py-4 border-b border-border shrink-0 flex gap-2">
            <Select value={selectedUserId} onValueChange={handleSelectChange}>
              <SelectTrigger className="flex-1 min-w-0 h-9 text-sm">
                <SelectValue placeholder="Select member to add…" />
              </SelectTrigger>
              <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
                {candidates.length === 0 ? (
                  <div className="py-3 px-3 text-xs text-muted-foreground">
                    All org members already added
                  </div>
                ) : (
                  candidates.map((c) => (
                    <SelectItem key={c.userId} value={c.userId}>
                      {c.displayName}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <LoadingButton
              size="sm"
              isPending={addMember.isPending}
              loadingText="Adding…"
              onClick={handleAdd}
              disabled={!selectedUserId}
            >
              <UserPlus className="h-4 w-4 mr-1.5" />
              Add
            </LoadingButton>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {membersQuery.isLoading ? (
            <div className="divide-y divide-border/60">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <Skeleton className="h-7 w-7 rounded-full" />
                  <div className="space-y-1 flex-1">
                    <Skeleton className="h-3.5 w-32" />
                    <Skeleton className="h-3 w-44" />
                  </div>
                </div>
              ))}
            </div>
          ) : members.length === 0 ? (
            <EmptyState
              illustrationPreset="team"
              title="No members yet"
              description="Add members to give them this group's permissions."
              compact
              className="border-0 bg-transparent py-12"
            />
          ) : (
            <div>
              {members.map((member) => (
                <MemberRow
                  key={member.userId}
                  member={member}
                  onRemove={handleRemove}
                  isPending={removingId === member.userId}
                />
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
