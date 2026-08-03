import type { ComponentType } from "react";
import {
  BookOpen,
  Briefcase,
  Contact2,
  Headphones,
  MessageSquare,
  Package,
  Receipt,
  Users,
} from "lucide-react";
import { GOALS, MODULE_CATALOG } from "./constants";
import type { WorkspacePreviewSnapshot } from "./preview-snapshot";
import { ORG_MODULE_KEYS, type OrgModuleKey } from "./wizard-data-schema";

export type ModuleIcon = ComponentType<{ className?: string }>;

export const MODULE_ICON: Record<string, ModuleIcon> = {
  crm: Contact2,
  hr: Users,
  inventory: Package,
  accounting: Receipt,
  build: Briefcase,
  support: Headphones,
  kb: BookOpen,
  chat: MessageSquare,
};

const MODULE_OUTCOMES: Record<string, readonly string[]> = {
  crm: ["Lead inbox + pipeline", "Deal stages ready", "Follow-ups tracked"],
  hr: ["Leave & attendance", "Team directory", "Onboarding checklist"],
  build: ["Task boards", "Sprint tracking", "Delivery updates"],
  accounting: ["Invoices & payments", "Bank reconcile", "Tax-ready reports"],
  inventory: ["Stock levels", "Warehouses", "Purchase orders"],
  support: ["Ticket queue", "SLA timers", "Customer replies"],
  kb: ["Team wiki", "SOPs & FAQs", "Searchable docs"],
  chat: ["Channels", "DMs & mentions", "Quick huddles"],
};

const STAT_PRESETS: Record<string, { label: string; value: string }> = {
  crm: { label: "Pipeline", value: "Ready" },
  hr: { label: "People", value: "Ready" },
  build: { label: "Delivery", value: "Ready" },
  accounting: { label: "Billing", value: "Ready" },
  inventory: { label: "Stock", value: "Ready" },
  support: { label: "Support", value: "Ready" },
  kb: { label: "Docs", value: "Ready" },
  chat: { label: "Chat", value: "Ready" },
};

export type MockStat = { id: string; label: string; value: string };
export type MockWidget = {
  id: string;
  title: string;
  subtitle: string;
  rows: readonly string[];
};
export type MockGoalChip = { id: string; label: string };

function isOrgModuleKey(value: string): value is OrgModuleKey {
  return (ORG_MODULE_KEYS as readonly string[]).includes(value);
}

export function resolvePreviewModules(
  snapshot: WorkspacePreviewSnapshot,
): OrgModuleKey[] {
  if (snapshot.goals.length === 0) return [];
  if (snapshot.modules.length > 0) return [...snapshot.modules];
  return snapshot.installedApps.filter(isOrgModuleKey);
}

export function buildGoalChips(goals: readonly string[]): MockGoalChip[] {
  return goals.map((id) => {
    const match = GOALS.find((g) => g.id === id);
    return { id, label: match?.label ?? id };
  });
}

export function buildStats(
  modules: readonly OrgModuleKey[],
  teamSize: string,
  goalsCount: number,
): MockStat[] {
  if (modules.length === 0) return [];

  const stats: MockStat[] = modules.slice(0, 3).map((key) => {
    const preset = STAT_PRESETS[key];
    const catalog = MODULE_CATALOG[key];
    return {
      id: key,
      label: preset?.label ?? catalog?.label ?? key,
      value:
        key === "hr" && teamSize
          ? teamSize.replace("+", "")
          : (preset?.value ?? "On"),
    };
  });

  if (stats.length === 1) {
    stats.push({
      id: "goals",
      label: "Goals",
      value: String(goalsCount || 1),
    });
    stats.push({
      id: "modules",
      label: "Modules",
      value: String(modules.length),
    });
  } else if (stats.length === 2) {
    stats.push({
      id: "modules",
      label: "Modules on",
      value: String(modules.length),
    });
  }

  return stats;
}

export function buildWidgets(
  modules: readonly OrgModuleKey[],
  goals: readonly string[],
  compact: boolean,
): MockWidget[] {
  if (modules.length === 0) return [];

  const goalOutcomes: string[] = [];
  for (const id of goals) {
    const outcome = GOALS.find((g) => g.id === id)?.outcome;
    if (outcome) goalOutcomes.push(outcome);
  }

  const rowBudget = compact ? 1 : modules.length <= 2 ? 3 : 2;

  return modules.map((key, index) => {
    const catalog = MODULE_CATALOG[key];
    const base = MODULE_OUTCOMES[key] ?? catalog?.setupTasks ?? ["Ready after launch"];
    const rows = [...base];
    if (!compact && index === 0 && goalOutcomes[0] && !rows.includes(goalOutcomes[0])) {
      rows.unshift(goalOutcomes[0]);
    }
    return {
      id: key,
      title: catalog?.label ?? key,
      subtitle: catalog?.description ?? "Enabled after launch",
      rows: rows.slice(0, rowBudget),
    };
  });
}

export function emptyPreviewCopy(snapshot: WorkspacePreviewSnapshot): string {
  if (snapshot.goals.length === 0) {
    return "Pick goals to preview your organization";
  }
  return "Your organization preview updates as you go";
}
