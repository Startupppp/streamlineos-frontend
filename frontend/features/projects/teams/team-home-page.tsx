"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PlusIcon, XIcon, EllipsisIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import {
  useProjectTeam,
  useUpdateProjectTeam,
  useDeleteProjectTeam,
  useAddProjectTeamMember,
  useRemoveProjectTeamMember,
  useUpdateProjectTeamMemberRole,
} from "@/hooks/api/projects/teams";
import { useCan } from "@/hooks/api/access";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MemberPicker } from "@/components/shared";
import { LoadingButton } from "@/components/ui/loading-button";
import { TeamFormSheet } from "./team-form-sheet";
import type { ProjectTeamMember, UpdateTeamInput } from "@/types/projects";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  PmPageShell,
  PmPanel,
  PmSection,
  PM_PANEL,
  PM_ROW,
} from "@/features/projects/shared/pm-chrome";
import { getUserDisplayName, getUserInitials } from "@/features/projects/shared/resolve-user-name";
import { TEXT_ONE_LINE } from "@/features/projects/shared/text-overflow";
import { cn } from "@/lib/utils";
import { resolveImageUrl } from "@/lib/utils";

function TeamActionsButton() {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <Button variant="outline" size="sm" className="gap-1.5 text-xs" {...hoverHandlers}>
      <EllipsisIcon ref={iconRef} size={14} /> Actions
    </Button>
  );
}

function AddMemberButton({
  isPending,
  onClick,
  disabled,
}: {
  isPending: boolean;
  onClick: () => void;
  disabled: boolean;
}) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <LoadingButton
      size="sm"
      className="gap-1 text-xs"
      onClick={onClick}
      disabled={disabled}
      isPending={isPending}
      loadingText="Adding…"
      {...hoverHandlers}
    >
      <PlusIcon ref={iconRef} size={12} /> Add
    </LoadingButton>
  );
}

function RemoveMemberButton({
  member,
  isPending,
  onRemove,
}: {
  member: ProjectTeamMember;
  isPending: boolean;
  onRemove: (userId: string) => void;
}) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  const handleClick = useCallback(() => onRemove(member.userId), [member.userId, onRemove]);
  return (
    <Button
      variant="ghost"
      size="icon"
      className="w-7 shrink-0"
      onClick={handleClick}
      disabled={isPending}
      aria-label="Remove member"
      {...hoverHandlers}
    >
      <XIcon ref={iconRef} size={14} />
    </Button>
  );
}

function MemberRoleSelect({
  member,
  isPending,
  onRoleChange,
}: {
  member: ProjectTeamMember;
  isPending: boolean;
  onRoleChange: (memberUserId: string, role: "member" | "lead") => void;
}) {
  const role = (member.role === "lead" ? "lead" : "member") as "member" | "lead";

  function handleValueChange(value: string) {
    onRoleChange(member.userId, value as "member" | "lead");
  }

  return (
    <Select value={role} onValueChange={handleValueChange} disabled={isPending}>
      <SelectTrigger className="h-8 w-24 shrink-0 text-[10px] border-input bg-card">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
        <SelectItem value="member">Member</SelectItem>
        <SelectItem value="lead">Lead</SelectItem>
      </SelectContent>
    </Select>
  );
}

function DetailSkeleton() {
  return (
    <PmPageShell>
      <div className={cn(PM_PANEL, "space-y-3 p-4")}>
        <div className="flex gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <div className={cn(PM_PANEL, "space-y-2 p-2")}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-md" />
        ))}
      </div>
    </PmPageShell>
  );
}

interface Props {
  teamId: number;
}

export function TeamHomePage({ teamId }: Props) {
  const canManage = useCan("projects:teams:manage");
  const router = useRouter();

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [addMemberId, setAddMemberId] = useState<string | undefined>(undefined);
  const [addMemberRole, setAddMemberRole] = useState<"member" | "lead">("member");

  const { data, isLoading, isError, refetch } = useProjectTeam(teamId);
  const updateTeam = useUpdateProjectTeam();
  const deleteTeam = useDeleteProjectTeam();
  const addMember = useAddProjectTeamMember(teamId);
  const removeMember = useRemoveProjectTeamMember(teamId);
  const updateMemberRole = useUpdateProjectTeamMemberRole(teamId);

  function handleEdit(input: UpdateTeamInput & { id: number }) {
    updateTeam.mutate(input, {
      onSuccess: () => {
        toast.success("Team updated");
        setEditOpen(false);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  function handleDeleteConfirm() {
    deleteTeam.mutate(teamId, {
      onSuccess: () => {
        toast.success("Team deleted");
        router.push("/projects/teams");
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  function handleAddMember() {
    if (!addMemberId) return;
    addMember.mutate(
      { userId: addMemberId, role: addMemberRole },
      {
        onSuccess: () => {
          toast.success("Member added");
          setAddMemberId(undefined);
          setAddMemberRole("member");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }

  function handleRemoveMember(userId: string) {
    removeMember.mutate(userId, {
      onSuccess: () => toast.success("Member removed"),
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  function handleRoleChange(memberUserId: string, role: "member" | "lead") {
    updateMemberRole.mutate(
      { memberUserId, role },
      {
        onSuccess: () => toast.success("Role updated"),
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }

  function handleRetry() {
    void refetch();
  }

  function handleOpenEdit() {
    setEditOpen(true);
  }

  function handleOpenDelete() {
    setDeleteOpen(true);
  }

  if (isLoading) {
    return (
      <PageWrapper title="Team" backHref="/projects/teams">
        <DetailSkeleton />
      </PageWrapper>
    );
  }

  if (isError || !data) {
    return (
      <PageWrapper title="Team" backHref="/projects/teams">
        <PmPageShell withGlow={false}>
          <PmSection index={0} className="flex min-h-0 flex-1 flex-col">
            <ErrorState className="flex-1" onRetry={handleRetry} />
          </PmSection>
        </PmPageShell>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title={data.name}
      subtitle={`Team · ${data.key}`}
      backHref="/projects/teams"
      actions={
        canManage ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <TeamActionsButton />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleOpenEdit}>Edit Team</DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={handleOpenDelete}>
                Delete Team
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : undefined
      }
    >
      <PmPageShell>
        <PmSection index={0}>
          <PmPanel className="flex flex-wrap items-center gap-3 p-4">
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs font-bold text-white"
              style={{ backgroundColor: data.color ?? "#64748b" }}
            >
              {data.icon ?? data.key.slice(0, 2)}
            </span>
            <span className="font-mono text-xs text-muted-foreground">{data.key}</span>
            {data.isPrivate ? (
              <Badge variant="outline" className="text-[10px]">
                Private
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-[10px]">
                Public
              </Badge>
            )}
            <span className="text-sm text-muted-foreground">
              {data.members.length} member{data.members.length !== 1 ? "s" : ""}
            </span>
          </PmPanel>
        </PmSection>

        <PmSection index={1} className="space-y-3">
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Members{data.members.length > 0 ? ` (${data.members.length})` : ""}
            </p>
            {canManage ? (
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <MemberPicker
                  mode="single"
                  value={addMemberId}
                  onChange={(id) => setAddMemberId(id ?? undefined)}
                  placeholder="Add a member…"
                  allowUnassigned={false}
                />
                <Select
                  value={addMemberRole}
                  onValueChange={(v) => setAddMemberRole(v as "member" | "lead")}
                >
                  <SelectTrigger className="h-8 w-24 text-xs border-input bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="lead">Lead</SelectItem>
                  </SelectContent>
                </Select>
                <AddMemberButton
                  disabled={!addMemberId}
                  isPending={addMember.isPending}
                  onClick={handleAddMember}
                />
              </div>
            ) : null}
          </div>

          {data.members.length === 0 ? (
            <PmPanel className="flex items-center justify-center p-4">
              <EmptyState
                illustrationPreset="projects"
                title="No members yet"
                description="Add members to this team."
                compact
              />
            </PmPanel>
          ) : (
            <PmPanel>
              {data.members.map((member) => {
                const displayName = getUserDisplayName({
                  firstName: member.firstName,
                  lastName: member.lastName,
                  email: member.email,
                });
                const initials = getUserInitials({
                  firstName: member.firstName,
                  lastName: member.lastName,
                  email: member.email,
                });
                return (
                  <div key={member.id} className={PM_ROW}>
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarImage src={resolveImageUrl(member.image)} />
                      <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span
                        className={cn(
                          TEXT_ONE_LINE,
                          "text-sm font-medium text-foreground",
                        )}
                      >
                        {displayName}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {member.email}
                      </span>
                    </div>
                    {canManage ? (
                      <MemberRoleSelect
                        member={member}
                        isPending={updateMemberRole.isPending}
                        onRoleChange={handleRoleChange}
                      />
                    ) : (
                      <Badge
                        variant="outline"
                        className="shrink-0 px-1.5 py-0.5 text-[10px] capitalize"
                      >
                        {member.role}
                      </Badge>
                    )}
                    {canManage ? (
                      <RemoveMemberButton
                        member={member}
                        isPending={removeMember.isPending}
                        onRemove={handleRemoveMember}
                      />
                    ) : null}
                  </div>
                );
              })}
            </PmPanel>
          )}
        </PmSection>
      </PmPageShell>

      <TeamFormSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        mode="edit"
        defaultValues={data}
        onSubmitCreate={() => undefined}
        onSubmitEdit={handleEdit}
        isPending={updateTeam.isPending}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &ldquo;{data.name}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. All team memberships will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={handleDeleteConfirm}
            >
              {deleteTeam.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}
