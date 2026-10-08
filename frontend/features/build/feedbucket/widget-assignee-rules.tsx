"use client";

import { useMemo } from "react";
import { toast } from "sonner";
import { MemberPicker } from "@/components/members/member-picker";
import { getErrorMessage } from "@/lib/get-error-message";
import { useUpdateFeedbucketWidget } from "@/hooks/api/feedbucket";
import type { FeedbucketWidget, FeedbucketSubmissionType } from "@/types/feedbucket";
import type { BuildMember } from "@/hooks/api/build/build-members";

const SUBMISSION_TYPES: { type: FeedbucketSubmissionType; label: string }[] = [
  { type: "bug", label: "Bug" },
  { type: "idea", label: "Idea" },
  { type: "feature", label: "Feature" },
  { type: "question", label: "Question" },
  { type: "praise", label: "Praise" },
  { type: "other", label: "Other" },
];

interface WidgetAssigneeRulesProps {
  widget: FeedbucketWidget;
  members: BuildMember[];
  membershipIdToUserId: Map<number, string>;
  disabled?: boolean;
}

export function WidgetAssigneeRules({
  widget,
  members,
  membershipIdToUserId,
  disabled = false,
}: WidgetAssigneeRulesProps) {
  const updateWidget = useUpdateFeedbucketWidget();
  const candidates = useMemo(
    () =>
      members.map((member) => ({
        id: member.id,
        name: member.name,
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email,
        image: member.image,
      })),
    [members],
  );

  function resolvedUserIdForType(type: FeedbucketSubmissionType): string {
    const membershipId = widget.assigneeRules?.[type];
    if (membershipId === undefined) return "";
    return membershipIdToUserId.get(membershipId) ?? "";
  }

  async function handleRuleChange(type: FeedbucketSubmissionType, userId: string) {
    const next: Partial<Record<FeedbucketSubmissionType, string>> = {};
    for (const { type: t } of SUBMISSION_TYPES) {
      const current = resolvedUserIdForType(t);
      const value = t === type ? userId : current;
      if (value) next[t] = value;
    }
    try {
      await updateWidget.mutateAsync({
        widgetId: widget.id,
        input: { assigneeRules: Object.keys(next).length > 0 ? next : null },
      });
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <div className="rounded-lg border border-border px-4 py-3 space-y-3">
      <div className="space-y-0.5">
        <p className="text-sm font-medium">Assignee rules</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Automatically assign new tickets by submission type. Overrides the default assignee when
          set.
        </p>
      </div>
      <div className="space-y-2">
        {SUBMISSION_TYPES.map(({ type, label }) => (
          <div key={type} className="flex items-center gap-3">
            <span className="w-20 shrink-0 text-xs font-normal text-muted-foreground">{label}</span>
            <div className="flex-1 min-w-0">
              <AssigneeRuleRow
                type={type}
                value={resolvedUserIdForType(type)}
                candidates={candidates}
                disabled={disabled || updateWidget.isPending}
                onChange={handleRuleChange}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface AssigneeRuleRowProps {
  type: FeedbucketSubmissionType;
  value: string;
  candidates: Array<{
    id: string;
    name: string | null;
    firstName: string | null;
    lastName: string | null;
    email: string;
    image: string | null;
  }>;
  disabled: boolean;
  onChange: (type: FeedbucketSubmissionType, userId: string) => Promise<void>;
}

function AssigneeRuleRow({ type, value, candidates, disabled, onChange }: AssigneeRuleRowProps) {
  function handleChange(userId: string | null) {
    void onChange(type, userId ?? "");
  }

  return (
    <MemberPicker
      candidates={candidates}
      value={value}
      onChange={handleChange}
      placeholder="Unassigned"
      allowUnassigned
      disabled={disabled}
    />
  );
}
