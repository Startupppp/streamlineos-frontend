"use client";

import { useMemo, useState } from "react";
import { useSourceOverride } from "@/hooks/common/use-source-override";
import { useSession } from "next-auth/react";
import { useProjectTemplates } from "@/hooks/api/build/templates";

export type ProjectCreateStepId =
  | "basics"
  | "type"
  | "template"
  | "workflow"
  | "people"
  | "review";

export interface ProjectCreateStep {
  id: ProjectCreateStepId;
  label: string;
}

const CORE_STEPS: readonly ProjectCreateStep[] = [
  { id: "basics", label: "Basics" },
  { id: "type", label: "Project Type" },
  { id: "workflow", label: "Workflow" },
  { id: "people", label: "People" },
  { id: "review", label: "Review & Create" },
];

export function resolveProjectCreateSteps(hasTemplates: boolean): readonly ProjectCreateStep[] {
  if (!hasTemplates) return CORE_STEPS;
  return [
    { id: "basics", label: "Basics" },
    { id: "type", label: "Project Type" },
    { id: "template", label: "Template" },
    { id: "workflow", label: "Workflow" },
    { id: "people", label: "People" },
    { id: "review", label: "Review & Create" },
  ];
}

export type WizardDraft = {
  name: string;
  key: string;
  description: string;
  managerId: string;
  clientId: string;
  startDate: string;
  endDate: string;
  projectType: string;
  templateId: number | null;
  modules: {
    epics: boolean;
    timeTracking: boolean;
    wiki: boolean;
  };
  features: Record<string, boolean>;
  workflow: string;
  memberIds: string[];
};

export type StepSharedProps = {
  draft: WizardDraft;
  updateDraft: (p: Partial<WizardDraft>) => void;
};

const DEFAULT_FEATURES: Record<string, boolean> = {
  backlog: true,
  kanban: true,
  qa: true,
  bugs: true,
  releases: true,
  timeTracking: true,
  budget: true,
  clientPortal: true,
  changeRequests: true,
  forms: true,
  chat: true,
  docs: true,
  automations: true,
  devops: true,
  approvals: true,
  ai: true,
};

function buildInitialDraft(creatorId: string | undefined): WizardDraft {
  return {
    name: "",
    key: "",
    description: "",
    managerId: creatorId ?? "",
    clientId: "",
    startDate: "",
    endDate: "",
    projectType: "",
    templateId: null,
    modules: { epics: true, timeTracking: true, wiki: true },
    features: { ...DEFAULT_FEATURES },
    workflow: "simple",
    memberIds: creatorId ? [creatorId] : [],
  };
}

export function useProjectCreate() {
  const { data: session } = useSession();
  const creatorId = session?.user?.id;
  const { data: templatePages } = useProjectTemplates();
  const [stepId, setStepId] = useState<ProjectCreateStepId>("basics");
  const [direction, setDirection] = useState(1);
  const [draft, setDraft] = useSourceOverride(creatorId, buildInitialDraft(creatorId), true);
  const hasTemplates =
    draft.templateId !== null ||
    (templatePages?.pages.some((page) => page.data.length > 0) ?? false);
  const steps = useMemo(
    () => resolveProjectCreateSteps(hasTemplates),
    [hasTemplates],
  );
  const stepIndex = Math.max(0, steps.findIndex((candidate) => candidate.id === stepId));
  const step = stepIndex + 1;
  const totalSteps = steps.length;
  const currentLabel = steps[stepIndex]?.label ?? "";

  function updateDraft(partial: Partial<WizardDraft>) {
    setDraft((prev) => ({ ...prev, ...partial }));
  }

  function goNext() {
    setDirection(1);
    setStepId(steps[Math.min(stepIndex + 1, totalSteps - 1)]?.id ?? "review");
  }

  function goBack() {
    setDirection(-1);
    setStepId(steps[Math.max(stepIndex - 1, 0)]?.id ?? "basics");
  }

  function goToStep(n: number) {
    const targetIndex = Math.max(0, Math.min(n - 1, totalSteps - 1));
    setDirection(targetIndex < stepIndex ? -1 : 1);
    setStepId(steps[targetIndex]?.id ?? "basics");
  }

  function reset() {
    setStepId("basics");
    setDirection(1);
    setDraft(buildInitialDraft(creatorId));
  }

  return {
    step,
    stepId,
    totalSteps,
    currentLabel,
    direction,
    draft,
    updateDraft,
    goNext,
    goBack,
    goToStep,
    reset,
  };
}
