"use client";

import { useMemo } from "react";
import { useProjectTemplates } from "@/hooks/api/build/templates";
import { useSimpleClientsList } from "@/hooks/api/crm/clients";
import type { WizardDraft } from "../use-project-create";
import { useWizardMembers, useWizardSessionUser } from "../use-wizard-members";
import { resolveWizardMemberLabel } from "../resolve-wizard-member-label";

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

const FEATURE_LABELS: Record<string, string> = {
  backlog: "Backlog",
  kanban: "Kanban Board",
  epics: "Epics",
  bugs: "Bug Tracker",
  qa: "QA / Testing",
  releases: "Releases",
  timeTracking: "Time Tracking",
  approvals: "Approvals",
  devops: "DevOps / CI",
  chat: "Chat",
  docs: "Docs / Wiki",
  budget: "Budget",
  clientPortal: "Client Portal",
  changeRequests: "Change Requests",
  forms: "Forms",
  automations: "Automations",
  ai: "AI Assistant",
};

export function StepReview({ draft }: StepReviewProps) {
  const sessionUser = useWizardSessionUser();
  const { data: templatePages } = useProjectTemplates();
  const members = useWizardMembers(100);
  const { data: clientsList } = useSimpleClientsList();

  const selectedLabels = useMemo(
    () =>
      draft.memberIds.map((id) =>
        resolveWizardMemberLabel(id, members, sessionUser, "No members added"),
      ),
    [draft.memberIds, members, sessionUser],
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
      ? ((templatePages?.pages.flatMap((page) => page.data) ?? []).find(
          (t) => t.id === draft.templateId,
        )?.name ?? "Unknown template")
      : "Blank";

  const managerLabel = useMemo(
    () => resolveWizardMemberLabel(draft.managerId, members, sessionUser, "No manager"),
    [draft.managerId, members, sessionUser],
  );

  const clientLabel = useMemo(() => {
    if (!draft.clientId) return null;
    const client = clientsList?.find((c) => String(c.id) === draft.clientId);
    return client ? client.name : "Unknown client";
  }, [draft.clientId, clientsList]);

  const enabledFeatures = useMemo(() => {
    const all: string[] = [];
    for (const [key, enabled] of Object.entries(draft.features)) {
      if (enabled && FEATURE_LABELS[key]) {
        all.push(FEATURE_LABELS[key]);
      }
    }
    if (draft.modules.epics && !draft.features["epics"]) all.push("Epics");
    if (draft.modules.wiki && !draft.features["docs"]) all.push("Wiki");
    return all;
  }, [draft.features, draft.modules]);

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
          label="Features"
          value={enabledFeatures.length > 0 ? enabledFeatures.join(", ") : "None"}
          muted={enabledFeatures.length === 0}
        />
        <ReviewRow
          label="Workflow"
          value={WORKFLOW_LABELS[draft.workflow] ?? draft.workflow}
        />
        <ReviewRow
          label="Manager"
          value={managerLabel}
          muted={!draft.managerId}
        />
        {clientLabel !== null && (
          <ReviewRow label="Client" value={clientLabel} />
        )}
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
      <span className="text-xs font-normal text-muted-foreground shrink-0 pt-px">{label}</span>
      <span className={muted ? "text-sm text-muted-foreground text-right" : "text-sm font-normal text-right"}>
        {value}
      </span>
    </div>
  );
}
