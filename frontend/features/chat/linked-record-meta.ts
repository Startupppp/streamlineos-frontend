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

interface LinkedRecordMetaEntry {
  label: string;
  module: RecordModule;
  icon: LucideIcon;
  subtitleMonospace: boolean;
  statusControl: boolean;
  parseRoute?: (pathname: string, search: URLSearchParams) => string | null;
}

export const LINKED_RECORD_META: Record<LinkedRecordType, LinkedRecordMetaEntry> = {
  ticket: {
    label: "Ticket",
    module: "build",
    icon: Ticket,
    subtitleMonospace: true,
    statusControl: true,
  },
  task: {
    label: "Task",
    module: "build",
    icon: CheckSquare,
    subtitleMonospace: false,
    statusControl: false,
  },
  project: {
    label: "Project",
    module: "build",
    icon: FolderKanban,
    subtitleMonospace: false,
    statusControl: false,
    parseRoute: (pathname) => {
      const m = pathname.match(/^\/build\/(\d+)$/);
      return m ? m[1] : null;
    },
  },
  cycle: {
    label: "Cycle",
    module: "build",
    icon: RefreshCw,
    subtitleMonospace: false,
    statusControl: false,
    parseRoute: (pathname) => {
      const m = pathname.match(/^\/build\/\d+\/cycles\/(\d+)$/);
      return m ? m[1] : null;
    },
  },
  release: {
    label: "Release",
    module: "build",
    icon: Rocket,
    subtitleMonospace: false,
    statusControl: false,
  },
  incident: {
    label: "Incident",
    module: "build",
    icon: Siren,
    subtitleMonospace: false,
    statusControl: false,
    parseRoute: (pathname) => {
      const m = pathname.match(/^\/build\/\d+\/incidents\/(\d+)$/);
      return m ? m[1] : null;
    },
  },
  client: {
    label: "Client",
    module: "crm",
    icon: Briefcase,
    subtitleMonospace: false,
    statusControl: false,
    parseRoute: (pathname) => {
      const m = pathname.match(/^\/crm\/clients\/(\d+)$/);
      return m ? m[1] : null;
    },
  },
  deal: {
    label: "Deal",
    module: "crm",
    icon: Handshake,
    subtitleMonospace: false,
    statusControl: false,
    parseRoute: (pathname) => {
      const m = pathname.match(/^\/crm\/deals\/(\d+)$/);
      return m ? m[1] : null;
    },
  },
  lead: {
    label: "Lead",
    module: "crm",
    icon: Contact2,
    subtitleMonospace: false,
    statusControl: false,
    parseRoute: (pathname) => {
      const m = pathname.match(/^\/crm\/leads\/(\d+)$/);
      return m ? m[1] : null;
    },
  },
  employee: {
    label: "Person",
    module: "hr",
    icon: UserRound,
    subtitleMonospace: false,
    statusControl: false,
    parseRoute: (pathname) => {
      const m = pathname.match(/^\/hr\/employees\/([\w-]+)$/);
      return m ? m[1] : null;
    },
  },
  doc_page: {
    label: "Doc",
    module: "docs",
    icon: FileText,
    subtitleMonospace: false,
    statusControl: false,
    parseRoute: (pathname) => {
      const m = pathname.match(/^\/knowledge\/wiki\/doc\/(\d+)$/);
      return m ? m[1] : null;
    },
  },
  calendar_event: {
    label: "Event",
    module: "calendar",
    icon: CalendarDays,
    subtitleMonospace: false,
    statusControl: false,
    parseRoute: (pathname, search) => {
      if (pathname !== "/calendar") return null;
      return search.get("event");
    },
  },
  support_ticket: {
    label: "Support ticket",
    module: "support",
    icon: LifeBuoy,
    subtitleMonospace: false,
    statusControl: false,
    parseRoute: (pathname, search) => {
      if (pathname !== "/support/inbox") return null;
      return search.get("ticket");
    },
  },
};

const FALLBACK_META: LinkedRecordMetaEntry = {
  label: "Record",
  module: "build",
  icon: FileText,
  subtitleMonospace: false,
  statusControl: false,
};

export function getLinkedRecordMeta(type: string): LinkedRecordMetaEntry {
  return (LINKED_RECORD_META as Record<string, LinkedRecordMetaEntry | undefined>)[type] ?? FALLBACK_META;
}

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
