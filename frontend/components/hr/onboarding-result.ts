import type { ManagerResolutionKind } from "@/types/hr";

interface OnboardedPrimaryManager {
  name: string;
  resolution?: ManagerResolutionKind;
}

const HOW: Record<ManagerResolutionKind, string> = {
  SELECTED: "",
  IN_FILE: "",
  FALLBACK_CONFIGURED: " (assigned by the default-manager policy — replace from their profile when you know the right manager)",
  FALLBACK_UPLOADER: " (assigned to you by the fallback policy — replace from their profile when you know the right manager)",
};

/**
 * PRD §7.2.7: the success message names the primary manager and whether it was
 * chosen or assigned by the fallback policy. `resolution` is only present for
 * callers with hr:employees:view, so without it the message names the manager only.
 */
export function describeOnboardingSuccess(primaryManager: OnboardedPrimaryManager | null | undefined): string {
  if (!primaryManager) return "Employee created";
  return `Employee created. Reports to ${primaryManager.name}${primaryManager.resolution ? HOW[primaryManager.resolution] : ""}.`;
}
