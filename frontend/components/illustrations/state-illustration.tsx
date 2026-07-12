import { cn } from "@/lib/utils";
import { IllustrationImage, type IllustrationName } from "./illustration-image";

export type StateIllustrationPreset =
  | "default"
  | "chart"
  | "report"
  | "documents"
  | "team"
  | "person"
  | "mail"
  | "upload"
  | "knowledge"
  | "projects"
  | "inventory"
  | "payroll"
  | "security"
  | "settings"
  | "automations"
  | "travel"
  | "learning"
  | "survey"
  | "chat"
  | "ticket"
  | "activity"
  | "calendar"
  | "search"
  | "companies"
  | "clients"
  | "deals"
  | "leads"
  | "expenses"
  | "approval"
  | "invitation"
  | "onboarding"
  | "alert"
  | "archive"
  | "devices"
  | "tasks"
  | "orders"
  | "permissions";

const PRESET_TO_ILLUSTRATION: Record<StateIllustrationPreset, IllustrationName> = {
  default: "empty-search",
  chart: "empty-chart",
  report: "empty-report",
  documents: "empty-documents",
  team: "empty-team",
  person: "empty-person",
  mail: "empty-mail",
  upload: "empty-upload",
  knowledge: "empty-knowledge",
  projects: "empty-projects",
  inventory: "empty-warehouse",
  payroll: "empty-payroll",
  security: "security",
  settings: "settings",
  automations: "automations",
  travel: "travel",
  learning: "learning",
  survey: "survey",
  chat: "chat",
  ticket: "empty-ticket",
  activity: "empty-activity",
  calendar: "empty-calendar",
  search: "empty-search",
  companies: "empty-companies",
  clients: "empty-clients",
  deals: "empty-deals",
  leads: "empty-leads",
  expenses: "empty-expenses",
  approval: "empty-approval",
  invitation: "invitation",
  onboarding: "onboarding",
  alert: "empty-ticket",
  archive: "empty-documents",
  devices: "empty-devices",
  tasks: "empty-projects",
  orders: "empty-documents",
  permissions: "security",
};

export function StateIllustration({
  preset = "default",
  className = "h-28 w-28",
}: {
  preset?: StateIllustrationPreset;
  className?: string;
}) {
  return (
    <div className={cn(className)}>
      <IllustrationImage name={PRESET_TO_ILLUSTRATION[preset]} />
    </div>
  );
}
