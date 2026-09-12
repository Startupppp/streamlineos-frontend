"use client";

import { memo } from "react";
import { User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AvatarStack } from "@/components/ui/avatar-stack";
import { cn, resolveImageUrl } from "@/lib/utils";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useUpdateProject } from "@/hooks/api/build";
import { MemberPicker } from "@/components/members/member-picker";
import {
  getUserDisplayName,
  getUserInitials,
} from "@/lib/person-display";
import { TruncatedText } from "@/components/ui/truncated-text";
import { TEXT_FLEX_CHILD } from "@/lib/text-overflow";
import { InlineFieldWrapper } from "@/features/build/views/card-inline-fields";
import type { ProjectListItem } from "@/types/projects/projects";

type ProjectPerson = ProjectListItem["manager"];
type ProjectMember = ProjectListItem["members"][number];

interface InlineProjectLeadProps {
  projectId: number;
  manager: ProjectPerson;
}

export const InlineProjectLead = memo(function InlineProjectLead({
  projectId,
  manager,
}: InlineProjectLeadProps) {
  const updateProject = useUpdateProject({
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const currentManagerId = manager?.id ?? undefined;
  const leadName = getUserDisplayName(manager);

  function handleLeadChange(userId: string | null) {
    updateProject.mutate({
      projectId,
      managerId: userId,
    });
  }

  const trigger = (
    <button
      type="button"
      className="w-full text-left transition-colors hover:opacity-80"
      aria-label="Change project lead"
    >
      {manager ? (
        <div className={cn(TEXT_FLEX_CHILD, "flex items-center gap-1.5")}>
          <Avatar className="h-5 w-5 shrink-0">
            {manager.image ? (
              <AvatarImage
                src={resolveImageUrl(manager.image)}
                alt={leadName}
              />
            ) : null}
            <AvatarFallback className="text-micro">
              {getUserInitials(manager)}
            </AvatarFallback>
          </Avatar>
          <TruncatedText
            text={leadName}
            className="max-w-[96px] text-xs text-muted-foreground"
          />
        </div>
      ) : (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <User className="h-3.5 w-3.5" aria-hidden="true" />
          Unassigned
        </span>
      )}
    </button>
  );

  return (
    <InlineFieldWrapper>
      <MemberPicker
        value={currentManagerId}
        onChange={handleLeadChange}
        allowUnassigned
        placeholder="Unassigned"
        trigger={trigger}
        contentAlign="start"
      />
    </InlineFieldWrapper>
  );
});

interface InlineProjectMembersProps {
  projectId: number;
  members: ProjectMember[];
}

export const InlineProjectMembers = memo(function InlineProjectMembers({
  projectId,
  members,
}: InlineProjectMembersProps) {
  const updateProject = useUpdateProject({
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const currentIds = members.map((m) => m.id);

  function handleToggle(userId: string) {
    const nextIds = currentIds.includes(userId)
      ? currentIds.filter((id) => id !== userId)
      : [...currentIds, userId];
    updateProject.mutate({ projectId, memberIds: nextIds });
  }

  const trigger = (
    <button
      type="button"
      className="transition-opacity hover:opacity-80"
      aria-label="Manage project members"
    >
      {members.length > 0 ? (
        <AvatarStack
          users={members}
          limit={3}
          className="[&_[data-slot=avatar]]:size-5 [&_[data-slot=avatar]]:text-micro"
        />
      ) : (
        <span className="text-xs text-muted-foreground">Add members</span>
      )}
    </button>
  );

  return (
    <InlineFieldWrapper>
      <MemberPicker
        mode="multi"
        values={currentIds}
        onToggle={handleToggle}
        placeholder="Add members"
        trigger={trigger}
        contentAlign="start"
      />
    </InlineFieldWrapper>
  );
});
