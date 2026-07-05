"use client";

import { useState } from "react";

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
  workflow: string;
  memberIds: string[];
};

export type StepSharedProps = {
  draft: WizardDraft;
  updateDraft: (p: Partial<WizardDraft>) => void;
};

const INITIAL_DRAFT: WizardDraft = {
  name: "",
  key: "",
  description: "",
  managerId: "",
  clientId: "",
  startDate: "",
  endDate: "",
  projectType: "",
  templateId: null,
  modules: { sprints: true, epics: true, timeTracking: true, wiki: true },
  workflow: "simple",
  memberIds: [],
};

export function useProjectCreate() {
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [draft, setDraft] = useState<WizardDraft>(INITIAL_DRAFT);

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
    setDraft(INITIAL_DRAFT);
  }

  return { step, direction, draft, updateDraft, goNext, goBack, reset };
}
