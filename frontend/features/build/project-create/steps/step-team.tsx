"use client";

import { User } from "lucide-react";
import { MemberPicker } from "@/components/members/member-picker";
import { useCan } from "@/hooks/api/access";
import type { StepSharedProps } from "../use-project-create";
import { useWizardSessionUser } from "../use-wizard-members";

export function StepTeam({ draft, updateDraft }: StepSharedProps) {
  const sessionUser = useWizardSessionUser();
  const currentUserId = sessionUser?.id;
  const canManage = useCan("build:manage");

  function handleToggle(userId: string) {
    if (userId === currentUserId) return;
    const next = draft.memberIds.includes(userId)
      ? draft.memberIds.filter((id) => id !== userId)
      : [...draft.memberIds, userId];
    updateDraft({ memberIds: next });
  }

  if (!canManage) {
    return (
      <div className="flex flex-col gap-2 rounded-xl border border-dashed p-6 text-center">
        <User className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-normal text-muted-foreground">
          You don&apos;t have invite permissions.
        </p>
        <p className="text-xs text-muted-foreground">
          You can add people after the project is created.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-muted/30 p-4">
        <div className="flex items-start gap-3">
          <User className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Add people from Build</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Only people with Build access are available. You can change the project team later.
            </p>
          </div>
        </div>
      </div>
      <MemberPicker
        mode="multi"
        directory="build"
        values={draft.memberIds}
        onToggle={handleToggle}
        placeholder="Select Build members…"
        searchLabel="Search Build members"
      />
    </div>
  );
}
