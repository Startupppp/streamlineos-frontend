import {
  BookOpen,
  Briefcase,
  CalendarDays,
  CheckSquare,
  Contact2,
  FileText,
  FolderKanban,
  Hammer,
  Handshake,
  LifeBuoy,
  RefreshCw,
  Rocket,
  Siren,
  Ticket,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { EntityRef } from "@/types/chat";
import type { GlobalSearchResult } from "@/components/command-palette/hooks/use-global-search";

type LinkedRecordType = EntityRef["type"];
type RecordModule = "crm" | "build" | "hr" | "docs" | "calendar" | "support";

const RECORD_MODULES: Record<RecordModule, { label: string; icon: LucideIcon }> = {
  crm: { label: "CRM", icon: Handshake },
  build: { label: "Build", icon: Hammer },
  hr: { label: "HR", icon: Users },
  docs: { label: "Docs", icon: BookOpen },
  calendar: { label: "Calendar", icon: CalendarDays },
  support: { label: "Support", icon: LifeBuoy },
};

const MODULE_ORDER: readonly RecordModule[] = ["crm", "build", "hr", "docs", "calendar", "support"];

export const LINKED_RECORD_META: Record<
  LinkedRecordType,
  { label: string; module: RecordModule; icon: LucideIcon }
> = {
  ticket: { label: "Ticket", module: "build", icon: Ticket },
  task: { label: "Task", module: "build", icon: CheckSquare },
  project: { label: "Project", module: "build", icon: FolderKanban },
  cycle: { label: "Cycle", module: "build", icon: RefreshCw },
  release: { label: "Release", module: "build", icon: Rocket },
  incident: { label: "Incident", module: "build", icon: Siren },
  client: { label: "Client", module: "crm", icon: Briefcase },
  deal: { label: "Deal", module: "crm", icon: Handshake },
  lead: { label: "Lead", module: "crm", icon: Contact2 },
  employee: { label: "Person", module: "hr", icon: UserRound },
  doc_page: { label: "Doc", module: "docs", icon: FileText },
  calendar_event: { label: "Event", module: "calendar", icon: CalendarDays },
  support_ticket: { label: "Support ticket", module: "support", icon: LifeBuoy },
};

export const RECORD_SEARCH_TYPES = [
  "lead",
  "deal",
  "client",
  "ticket",
  "employee",
  "doc_page",
  "calendar_event",
  "support_ticket",
] as const satisfies readonly LinkedRecordType[];

export type RecordSearchResult = GlobalSearchResult & {
  type: (typeof RECORD_SEARCH_TYPES)[number];
};

export interface RecordGroup {
  module: RecordModule;
  label: string;
  icon: LucideIcon;
  items: RecordSearchResult[];
}

export function groupRecordResults(results: readonly RecordSearchResult[]): RecordGroup[] {
  return MODULE_ORDER.flatMap((module) => {
    const items = results.filter((result) => LINKED_RECORD_META[result.type].module === module);
    return items.length > 0 ? [{ module, ...RECORD_MODULES[module], items }] : [];
  });
}
