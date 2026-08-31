"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { UserPlus, X, Pencil, Loader2, KeyRound } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";
import {
  useModuleMembersInfinite,
  useModuleMyPermissions,
  useModuleRoleGroups,
  type ModuleMember,
} from "@/hooks/api/module-access";
import {
  AddMemberDialog,
  EditGroupsDialog,
  ConfirmRemoveDialog,
} from "@/features/module-access/components/member-dialogs";
import { MemberGrantsSheet } from "@/features/module-access/components/member-grants-sheet";

const PAGE_SIZE = 20;

function getUserInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0] ?? "")
    .join("")
    .toUpperCase();
}

function resolveDisplayName(member: { displayName: string; email: string }): string {
  return member.displayName || member.email || "Unknown user";
}

function MemberRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border/60">
      <Skeleton className="h-8 w-8 rounded-full shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-32" />
        <Skeleton className="h-3 w-44" />
      </div>
      <Skeleton className="h-5 w-16 rounded-full" />
    </div>
  );
}

interface MemberRowProps {
  member: ModuleMember;
  canManage: boolean;
  onEdit: (member: ModuleMember) => void;
  onRemove: (member: ModuleMember) => void;
  onManageGrants: (member: ModuleMember) => void;
  isRemoving: boolean;
}

function MemberRow({ member, canManage, onEdit, onRemove, onManageGrants, isRemoving }: MemberRowProps) {
  const displayName = resolveDisplayName(member);
  const handleEdit = useCallback(() => onEdit(member), [member, onEdit]);
  const handleRemove = useCallback(() => onRemove(member), [member, onRemove]);
  const handleManageGrants = useCallback(() => onManageGrants(member), [member, onManageGrants]);

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border/60 last:border-0">
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarImage src={member.avatarUrl ?? undefined} />
        <AvatarFallback className="text-micro">
          {getUserInitials(displayName)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{displayName}</p>
        <p className="text-xs text-muted-foreground truncate">{member.email}</p>
      </div>
      <div className="flex items-center gap-1.5 flex-wrap justify-end shrink-0 max-w-[40%]">
        {member.groups.map((g) => (
          <Badge key={g.id} variant="secondary" className="text-micro px-1.5 py-0">
            {g.name}
          </Badge>
        ))}
        {member.groups.length === 0 && (
          <span className="text-dense text-muted-foreground">No groups</span>
        )}
      </div>
      {canManage && (
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={handleManageGrants}
            className="inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label={`Custom permissions for ${displayName}`}
          >
            <KeyRound className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={handleEdit}
            className="inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label={`Edit groups for ${displayName}`}
          >
            <Pencil className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={handleRemove}
            disabled={isRemoving}
            className="inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            aria-label={`Remove ${displayName}`}
          >
            {isRemoving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <X className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      )}
    </div>
  );
}

interface ModuleMembersTabProps {
  moduleKey: string;
  canManage: boolean;
  focusUserId?: string;
  addOpen?: boolean;
  onAddOpenChange?: (open: boolean) => void;
  hideToolbar?: boolean;
}

export function ModuleMembersTab({
  moduleKey,
  canManage,
  focusUserId,
  addOpen: addOpenProp,
  onAddOpenChange,
  hideToolbar = false,
}: ModuleMembersTabProps) {
  const [internalAddOpen, setInternalAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ModuleMember | null>(null);
  const [removeTarget, setRemoveTarget] = useState<ModuleMember | null>(null);
  const [grantsTarget, setGrantsTarget] = useState<ModuleMember | null>(null);

  const addOpen = onAddOpenChange ? (addOpenProp ?? false) : internalAddOpen;
  const setAddOpen = onAddOpenChange ?? setInternalAddOpen;

  const membersQuery = useModuleMembersInfinite(moduleKey, PAGE_SIZE);
  const groupsQuery = useModuleRoleGroups(moduleKey);

  const members = membersQuery.data?.pages.flatMap((p) => p.data) ?? [];
  const allGroups =
    groupsQuery.data?.pages.flatMap((p) => p.data).map((g) => ({ id: g.id, name: g.name })) ?? [];

  const focusLookup = useModuleMembersInfinite(moduleKey, 1, {
    enabled: focusUserId !== undefined && canManage,
    userId: focusUserId,
  });
  const myPermissionsQuery = useModuleMyPermissions(moduleKey);

  const triggeredRef = useRef(false);

  useEffect(() => {
    triggeredRef.current = false;
  }, [focusUserId, moduleKey]);

  useEffect(() => {
    if (focusUserId === undefined) return;
    if (!myPermissionsQuery.isSuccess) return;
    if (triggeredRef.current) return;
    if (!canManage) {
      triggeredRef.current = true;
      toast.info("You do not have permission to inspect or change this member's module access.");
      return;
    }
    if (!focusLookup.isSuccess) return;
    triggeredRef.current = true;
    const found = focusLookup.data?.pages[0]?.data[0] ?? null;
    if (found !== null) {
      setEditTarget(found);
    } else {
      setAddOpen(true);
    }
  }, [
    focusUserId,
    focusLookup.isSuccess,
    focusLookup.data,
    myPermissionsQuery.isSuccess,
    canManage,
    setAddOpen,
  ]);

  const handleOpenAdd = useCallback(() => {
    if (canManage) setAddOpen(true);
  }, [canManage, setAddOpen]);
  const handleEditMember = useCallback(
    (member: ModuleMember) => {
      if (canManage) setEditTarget(member);
    },
    [canManage],
  );
  const handleRemoveMember = useCallback(
    (member: ModuleMember) => {
      if (canManage) setRemoveTarget(member);
    },
    [canManage],
  );
  const handleEditClose = useCallback((open: boolean) => {
    if (!open) setEditTarget(null);
  }, []);
  const handleRemoveClose = useCallback((open: boolean) => {
    if (!open) setRemoveTarget(null);
  }, []);
  const handleManageGrants = useCallback((member: ModuleMember) => {
    setGrantsTarget(member);
  }, []);
  const handleGrantsClose = useCallback((open: boolean) => {
    if (!open) setGrantsTarget(null);
  }, []);
  const handleLoadMore = useCallback(() => {
    void membersQuery.fetchNextPage();
  }, [membersQuery]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {canManage && !hideToolbar ? (
        <div className="flex justify-end">
          <Button size="sm" onClick={handleOpenAdd}>
            <UserPlus className="mr-1.5 h-4 w-4" />
            Add member
          </Button>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card">
        {membersQuery.isLoading ? (
          <div className="divide-y divide-border/60">
            {Array.from({ length: 5 }).map((_, i) => (
              <MemberRowSkeleton key={i} />
            ))}
          </div>
        ) : membersQuery.isError ? (
          <EmptyState
            illustrationPreset="team"
            title="Failed to load members"
            description="Check your connection and try again."
            action={{
              label: "Retry",
              onClick: () => void membersQuery.refetch(),
            }}
          />
        ) : members.length === 0 ? (
          <EmptyState
            illustrationPreset="team"
            title="No members yet"
            description={
              canManage
                ? "Add members to grant them access to this module."
                : "No members are assigned to this module yet."
            }
            action={
              canManage ? { label: "Add member", onClick: handleOpenAdd } : undefined
            }
          />
        ) : (
          <>
            <div className="flex-1 overflow-y-auto">
              {members.map((member) => (
                <MemberRow
                  key={member.userId}
                  member={member}
                  canManage={canManage}
                  onEdit={handleEditMember}
                  onRemove={handleRemoveMember}
                  onManageGrants={handleManageGrants}
                  isRemoving={false}
                />
              ))}
            </div>
            {membersQuery.hasNextPage ? (
              <div className="border-t border-border/60 px-4 py-3 flex justify-center">
                <LoadingButton
                  variant="ghost"
                  size="sm"
                  onClick={handleLoadMore}
                  isPending={membersQuery.isFetchingNextPage}
                >
                  Load more
                </LoadingButton>
              </div>
            ) : null}
          </>
        )}
      </div>

      {canManage ? (
        <>
          <AddMemberDialog
            open={addOpen}
            onOpenChange={setAddOpen}
            moduleKey={moduleKey}
            allGroups={allGroups}
            defaultUserId={focusUserId}
          />

          <EditGroupsDialog
            open={!!editTarget}
            onOpenChange={handleEditClose}
            moduleKey={moduleKey}
            member={editTarget}
            allGroups={allGroups}
          />

          <ConfirmRemoveDialog
            open={!!removeTarget}
            onOpenChange={handleRemoveClose}
            moduleKey={moduleKey}
            member={removeTarget}
          />

          <MemberGrantsSheet
            open={grantsTarget !== null}
            onOpenChange={handleGrantsClose}
            moduleKey={moduleKey}
            member={grantsTarget}
            canManage={canManage}
          />
        </>
      ) : null}
    </div>
  );
}
