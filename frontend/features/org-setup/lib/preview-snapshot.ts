import type { WizardData } from "./types";

export type WorkspacePreviewSnapshot = {
  companyName: string;
  industry: string;
  teamSize: string;
  goals: readonly string[];
  modules: readonly string[];
  installedApps: readonly string[];
  inviteesCount: number;
};

export function toPreviewSnapshot(data: WizardData): WorkspacePreviewSnapshot {
  return {
    companyName: data.companyName,
    industry: data.industry,
    teamSize: data.teamSize,
    goals: data.goals,
    modules: data.modules,
    installedApps: data.installedApps,
    inviteesCount: data.invitees.length,
  };
}

export function previewSnapshotsEqual(
  a: WorkspacePreviewSnapshot,
  b: WorkspacePreviewSnapshot,
): boolean {
  return (
    a.companyName === b.companyName &&
    a.industry === b.industry &&
    a.teamSize === b.teamSize &&
    a.inviteesCount === b.inviteesCount &&
    a.goals === b.goals &&
    a.modules === b.modules &&
    a.installedApps === b.installedApps
  );
}
