"use client";

import { useMemo } from "react";
import { useProjectTemplates } from "@/hooks/api/build/templates";
import { useOrgMembers } from "@/hooks/api/organization";
import { getUserDisplayName } from "@/lib/person-display";
import type { WizardDraft } from "../use-project-create";

interface StepReviewProps {
  draft: WizardDraft;
}

const WORKFLOW_LABELS: Record<string, string> = {
  simple: "Simple",
  developer: "Developer",
  qa: "QA",
  client: "Client Delivery",
  support: "Support",
  custom: "Custom",
};

export function StepReview({ draft }: StepReviewProps) {
  const { data: templates } = useProjectTemplates();
  const { data: membersData } = useOrgMembers(1, 100);
  const members = useMemo(() => membersData?.data ?? [], [membersData]);

  const selectedLabels = useMemo(
    () =>
      draft.memberIds.map((id) => {
        const m = members.find((x) => x.userId === id);
        if (!m) return "Unknown member";
        return getUserDisplayName({ name: m.name, email: m.email });
      }),
    [draft.memberIds, members],
  );

  const teamLabel =
    selectedLabels.length === 0
      ? "No members added"
      : [
          ...selectedLabels.slice(0, 2),
          ...(selectedLabels.length > 2
            ? [`+${selectedLabels.length - 2} more`]
            : []),
        ].join(", ");
  const templateName =
    draft.templateId !== null
      ? (templates ?? []).find((t) => t.id === draft.templateId)?.name ?? "Unknown template"
      : "Blank";

  const moduleEntries: Array<[string, boolean]> = [
    ["Sprints", draft.modules.sprints],
    ["Epics", draft.modules.epics],
    ["Time Tracking", draft.modules.timeTracking],
    ["Wiki", draft.modules.wiki],
  ];
  const enabledModules = moduleEntries.filter(([, enabled]) => enabled).map(([name]) => name);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Review your settings before creating the project.</p>

      <div className="rounded-xl border divide-y">
        <ReviewRow label="Project Name" value={draft.name} />
        {!draft.templateId && <ReviewRow label="Project Key" value={draft.key} />}
        {draft.description && <ReviewRow label="Description" value={draft.description} />}
        {draft.startDate && <ReviewRow label="Start Date" value={draft.startDate} />}
        {draft.endDate && <ReviewRow label="End Date" value={draft.endDate} />}

        <ReviewRow
          label="Project Type"
          value={draft.projectType || "Not specified"}
          muted={!draft.projectType}
        />
        <ReviewRow label="Template" value={templateName} />
        <ReviewRow
          label="Modules"
          value={enabledModules.length > 0 ? enabledModules.join(", ") : "None"}
          muted={enabledModules.length === 0}
        />
        <ReviewRow
          label="Workflow"
          value={WORKFLOW_LABELS[draft.workflow] ?? draft.workflow}
        />
        <ReviewRow
          label="Team"
          value={teamLabel}
          muted={draft.memberIds.length === 0}
        />
      </div>
    </div>
  );
}

interface ReviewRowProps {
  label: string;
  value: string;
  muted?: boolean;
}

function ReviewRow({ label, value, muted = false }: ReviewRowProps) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3">
      <span className="text-xs font-medium text-muted-foreground shrink-0 pt-px">{label}</span>
      <span className={muted ? "text-sm text-muted-foreground text-right" : "text-sm font-medium text-right"}>
        {value}
      </span>
    </div>
  );
}
