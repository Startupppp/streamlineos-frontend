"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

export const TOTAL_STEPS = 7;

export const STEP_LABELS: readonly string[] = [
  "Basics",
  "Project Type",
  "Template",
  "Features",
  "Workflow",
  "Team",
  "Review & Create",
];

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
    sprints: boolean;
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
  sprints: true,
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
    modules: { sprints: true, epics: true, timeTracking: true, wiki: true },
    features: { ...DEFAULT_FEATURES },
    workflow: "simple",
    memberIds: creatorId ? [creatorId] : [],
  };
}

export function useProjectCreate() {
  const { data: session } = useSession();
  const creatorId = session?.user?.id;
  const seededRef = useRef(false);
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [draft, setDraft] = useState<WizardDraft>(() => buildInitialDraft(undefined));

  useEffect(() => {
    if (seededRef.current || !creatorId) return;
    seededRef.current = true;
    setDraft(buildInitialDraft(creatorId));
  }, [creatorId]);

  function updateDraft(partial: Partial<WizardDraft>) {
    setDraft((prev) => ({ ...prev, ...partial }));
  }

  function goNext() {
    setDirection(1);
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }

  function goBack() {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 1));
  }

  function reset() {
    setStep(1);
    setDirection(1);
    seededRef.current = false;
    setDraft(buildInitialDraft(creatorId));
    if (creatorId) seededRef.current = true;
  }

  return { step, direction, draft, updateDraft, goNext, goBack, reset };
}
