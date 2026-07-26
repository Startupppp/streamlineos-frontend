"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Trash2Icon } from "@animateicons/react/lucide";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { MemberPicker } from "@/components/shared";
import { LoadingButton } from "@/components/ui/loading-button";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOrgMembers } from "@/hooks/api/organization";
import { useCan } from "@/hooks/api/access";
import {
  usePmWorkspaceMembers,
  useAddPmWorkspaceMember,
  useRemovePmWorkspaceMember,
} from "@/hooks/api/projects";
import {
  getUserDisplayName,
  getUserInitials,
} from "@/features/projects/shared/resolve-user-name";
import { getErrorMessage } from "@/lib/get-error-message";
import type {
  PmWorkspace,
  PmWorkspaceMember,
  PmWorkspaceMemberRole,
} from "@/types/projects";

interface Props {
  workspace: PmWorkspace | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PmWorkspaceMembersSheet({ workspace, open, onOpenChange }: Props) {
  const pmWorkspaceId = workspace?.pmWorkspaceId ?? null;
  const canManage = useCan("projects:workspaces:members:manage");

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [role, setRole] = useState<PmWorkspaceMemberRole>("member");

  const { data, isLoading, isError } = usePmWorkspaceMembers(pmWorkspaceId, {
    page: 1,
    limit: 100,
  });
  const { data: orgMembersRes } = useOrgMembers(1, 100);

  const addMember = useAddPmWorkspaceMember(pmWorkspaceId ?? "");
  const removeMember = useRemovePmWorkspaceMember(pmWorkspaceId ?? "");

  const memberByUserId = useMemo(() => {
    const map = new Map<string, { name: string | null; email: string }>();
    for (const m of orgMembersRes?.data ?? []) map.set(m.userId, m);
    return map;
  }, [orgMembersRes]);

  const rows = data?.data ?? [];

  function displayName(userId: string): string {
    return getUserDisplayName(memberByUserId.get(userId) ?? null);
  }

  function initials(userId: string): string {
    return getUserInitials(memberByUserId.get(userId) ?? null);
  }

  function handleAdd() {
    if (!selectedUserId) return;
    addMember.mutate(
      { userId: selectedUserId, role },
      {
        onSuccess: () => {
          toast.success("Member added");
          setSelectedUserId(null);
          setRole("member");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }

  function handleRemove(member: PmWorkspaceMember) {
    removeMember.mutate(member.pmWorkspaceMembershipId, {
      onSuccess: () => toast.success("Member removed"),
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  function handleRoleChange(value: string) {
    setRole(value as PmWorkspaceMemberRole);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="shrink-0 border-b px-4 py-3">
          <SheetTitle>Workspace Members</SheetTitle>
          <SheetDescription>
            {workspace ? `Manage who can access "${workspace.name}".` : "Manage members."}
          </SheetDescription>
        </SheetHeader>
        <SheetBody className="flex min-h-0 flex-1 flex-col gap-3 px-4 py-3">
          {canManage ? (
            <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-2">
              <MemberPicker
                mode="single"
                value={selectedUserId ?? undefined}
                onChange={setSelectedUserId}
                placeholder="Select a member to add"
              />
              <div className="flex items-center gap-2">
                <Select value={role} onValueChange={handleRoleChange}>
                  <SelectTrigger className="h-8 w-28 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
                <LoadingButton
                  size="sm"
                  className="text-xs"
                  isPending={addMember.isPending}
                  loadingText="Adding…"
                  disabled={!selectedUserId}
                  onClick={handleAdd}
                >
                  Add member
                </LoadingButton>
              </div>
            </div>
          ) : null}

          <div className="min-h-0 flex-1 overflow-y-auto">
            {isLoading ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Loading members…
              </p>
            ) : isError ? (
              <p className="py-6 text-center text-sm text-destructive">
                Failed to load members.
              </p>
            ) : rows.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No members yet.
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {rows.map((m) => (
                  <li key={m.pmWorkspaceMembershipId} className="flex items-center gap-2 py-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-medium text-primary">
                      {initials(m.userId)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                      {displayName(m.userId)}
                    </span>
                    <Badge variant="outline" className="px-1.5 py-0.5 text-[10px] capitalize">
                      {m.role}
                    </Badge>
                    {canManage ? (
                      <AnimatedIconButton
                        icon={Trash2Icon}
                        variant="ghost"
                        size="icon"
                        className="w-7 text-muted-foreground hover:text-destructive"
                        aria-label={`Remove ${displayName(m.userId)}`}
                        onClick={() => handleRemove(m)}
                      />
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
