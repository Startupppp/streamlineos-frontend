"use client";

import { useMemo } from "react";
import { toast } from "sonner";
import { UserCombobox } from "@/components/ui/user-combobox";
import { getErrorMessage } from "@/lib/get-error-message";
import { useUpdateFeedbucketWidget } from "@/hooks/api/feedbucket";
import type { FeedbucketWidget, FeedbucketSubmissionType } from "@/types/feedbucket";
import type { OrgMember } from "@/hooks/api/organization-schema";

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
  members: OrgMember[];
}

export function WidgetAssigneeRules({ widget, members }: WidgetAssigneeRulesProps) {
  const updateWidget = useUpdateFeedbucketWidget();

  const membershipIdToUserId = useMemo(() => {
    const map = new Map<number, string>();
    for (const m of members) map.set(m.membershipId, m.userId);
    return map;
  }, [members]);

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
            <span className="w-20 shrink-0 text-xs font-medium text-muted-foreground">{label}</span>
            <div className="flex-1 min-w-0">
              <AssigneeRuleRow
                type={type}
                value={resolvedUserIdForType(type)}
                disabled={updateWidget.isPending}
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
  disabled: boolean;
  onChange: (type: FeedbucketSubmissionType, userId: string) => Promise<void>;
}

function AssigneeRuleRow({ type, value, disabled, onChange }: AssigneeRuleRowProps) {
  function handleChange(userId: string) {
    void onChange(type, userId);
  }

  return (
    <UserCombobox
      value={value}
      onChange={handleChange}
      placeholder="Unassigned"
      allowUnassigned
      disabled={disabled}
    />
  );
}
