"use client";

import { useMemo, type ReactNode } from "react";
import { CheckCircle2, FolderKanban, Settings2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
    () => draft.memberIds.map((id) => resolveWizardMemberLabel(id, members, sessionUser, "Unknown member")),
    [draft.memberIds, members, sessionUser],
  );
  const templateName = draft.templateId !== null
    ? ((templatePages?.pages.flatMap((page) => page.data) ?? []).find((template) => template.id === draft.templateId)?.name ?? "Unknown template")
    : "Blank project";
  const managerLabel = useMemo(
    () => resolveWizardMemberLabel(draft.managerId, members, sessionUser, "No manager"),
    [draft.managerId, members, sessionUser],
  );
  const clientLabel = useMemo(() => {
    if (!draft.clientId) return "No client";
    return clientsList?.find((client) => String(client.id) === draft.clientId)?.name ?? "Unknown client";
  }, [draft.clientId, clientsList]);
  const enabledFeatures = useMemo(() => {
    const labels = Object.entries(draft.features)
      .filter(([, enabled]) => enabled)
      .flatMap(([key]) => FEATURE_LABELS[key] ? [FEATURE_LABELS[key]] : []);
    if (draft.modules.epics && !draft.features.epics) labels.push("Epics");
    if (draft.modules.wiki && !draft.features.docs) labels.push("Wiki");
    return labels;
  }, [draft.features, draft.modules]);

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-xl border border-status-success-rule bg-status-success-surface p-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-status-success-fill text-primary-foreground">
          <CheckCircle2 className="size-4" aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm font-medium text-foreground">Ready to create</p>
          <p className="text-xs text-muted-foreground">Review the project scope, delivery setup, and Build members below.</p>
        </div>
      </div>

      <ReviewSection icon={<FolderKanban className="size-4" />} title="Project">
        <ReviewGrid>
          <ReviewField label="Name" value={draft.name} />
          {!draft.templateId ? <ReviewField label="Key" value={draft.key} mono /> : null}
          <ReviewField label="Type" value={draft.projectType || "Not specified"} muted={!draft.projectType} />
          <ReviewField label="Template" value={templateName} />
          {draft.clientId ? <ReviewField label="Client" value={clientLabel} /> : null}
          {draft.description ? <ReviewField label="Description" value={draft.description} wide /> : null}
        </ReviewGrid>
      </ReviewSection>

      <ReviewSection icon={<Settings2 className="size-4" />} title="Delivery">
        <ReviewGrid>
          <ReviewField label="Workflow" value={WORKFLOW_LABELS[draft.workflow] ?? draft.workflow} />
          <ReviewField label="Schedule" value={formatSchedule(draft.startDate, draft.endDate)} muted={!draft.startDate && !draft.endDate} />
        </ReviewGrid>
        <div className="mt-3 border-t border-border pt-3">
          <p className="mb-2 text-micro font-medium uppercase tracking-wide text-muted-foreground">Enabled features</p>
          <div className="flex flex-wrap gap-1.5">
            {enabledFeatures.length ? enabledFeatures.map((feature) => (
              <Badge key={feature} variant="secondary" className="font-normal">{feature}</Badge>
            )) : <span className="text-xs text-muted-foreground">None</span>}
          </div>
        </div>
      </ReviewSection>

      <ReviewSection icon={<Users className="size-4" />} title="People">
        <ReviewGrid>
          <ReviewField label="Project manager" value={managerLabel} muted={!draft.managerId} />
          <ReviewField label="Build members" value={selectedLabels.length ? `${selectedLabels.length} selected` : "No members added"} muted={!selectedLabels.length} />
        </ReviewGrid>
        {selectedLabels.length ? (
          <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border pt-3">
            {selectedLabels.slice(0, 2).map((label) => <Badge key={label} variant="outline">{label}</Badge>)}
            {selectedLabels.length > 2 ? <Badge variant="secondary">+{selectedLabels.length - 2} more</Badge> : null}
          </div>
        ) : null}
      </ReviewSection>
    </div>
  );
}

function formatSchedule(startDate: string | undefined, endDate: string | undefined): string {
  if (startDate && endDate) return `${startDate} – ${endDate}`;
  if (startDate) return `Starts ${startDate}`;
  if (endDate) return `Due ${endDate}`;
  return "No dates set";
}

function ReviewSection({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-xs">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-md bg-muted text-muted-foreground" aria-hidden="true">{icon}</span>
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function ReviewGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>;
}

function ReviewField({ label, value, muted = false, mono = false, wide = false }: {
  label: string;
  value: string;
  muted?: boolean;
  mono?: boolean;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <p className="text-micro font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={muted ? "mt-1 text-sm text-muted-foreground" : mono ? "mt-1 font-mono text-sm text-foreground" : "mt-1 text-sm font-medium text-foreground"}>{value}</p>
    </div>
  );
}
