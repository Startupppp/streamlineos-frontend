import type { ProjectHealth } from "@/types/projects/projects";

export const PROJECT_HEALTH_LABEL: Record<ProjectHealth, string> = {
  on_track: "On track",
  at_risk: "At risk",
  off_track: "Off track",
};

export function projectHealthLabel(
  health: ProjectHealth | string | null | undefined,
): string {
  if (!health) return "On track";
  const key = String(health).toLowerCase().replace(/-/g, "_") as ProjectHealth;
  if (key in PROJECT_HEALTH_LABEL) return PROJECT_HEALTH_LABEL[key];
  const analytics: Record<string, string> = {
    excellent: "On track",
    good: "On track",
    at_risk: "At risk",
    critical: "Off track",
    not_started: "Not started",
  };
  return analytics[key] ?? String(health).replaceAll("_", " ");
}
