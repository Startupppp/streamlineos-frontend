const STORAGE_KEY = "streamline:onboarding-wizard";

export interface WizardState {
  goals: string[];
  industry: string;
  orgName: string;
  installedModules: string[];
  teamMembersInvited: number;
  currentStep: number;
}

export const WIZARD_DEFAULTS: WizardState = {
  goals: [],
  industry: "",
  orgName: "",
  installedModules: [],
  teamMembersInvited: 0,
  currentStep: 0,
};

function sanitizeStep(state: WizardState): number {
  const { currentStep, goals, industry, orgName } = state;
  if (!goals.length) return Math.min(currentStep, 1);
  if (!industry) return Math.min(currentStep, 2);
  if (!orgName) return Math.min(currentStep, 3);
  return Math.min(currentStep, 6);
}

export function loadWizardState(): WizardState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...WIZARD_DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<WizardState>;
    const state = { ...WIZARD_DEFAULTS, ...parsed };
    return { ...state, currentStep: sanitizeStep(state) };
  } catch {
    return { ...WIZARD_DEFAULTS };
  }
}

export function saveWizardState(state: WizardState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage unavailable (e.g. private browsing with full quota)
  }
}

export function clearWizardState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
