import { formatShortDate } from "@/lib/date-utils";
import type { Ticket } from "@/types/projects";

export interface TicketConflictFieldDiff {
  key: string;
  label: string;
  serverValue: string;
  pendingValue: string;
}

interface NameEntry {
  id: number;
  name: string;
}

export interface TicketConflictNameLookups {
  members: { id: string; name: string }[];
  epics: NameEntry[];
  modules: NameEntry[];
  cycles: NameEntry[];
  customers: NameEntry[];
}

const EMPTY_VALUE = "Not set";
const UNKNOWN_MEMBER = "Unknown member";
const MAX_VALUE_LENGTH = 140;

const SKIPPED_KEYS = new Set(["ticketId", "expectedUpdatedAt", "version", "rank"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isBlank(value: unknown): boolean {
  if (value === null || value === undefined || value === "") return true;
  return Array.isArray(value) && value.length === 0;
}

function truncate(value: string): string {
  return value.length > MAX_VALUE_LENGTH ? `${value.slice(0, MAX_VALUE_LENGTH)}…` : value;
}

function toPlainText(value: unknown): string {
  return String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeDefault(value: unknown): string {
  if (isBlank(value)) return "";
  if (Array.isArray(value)) return value.map((entry) => String(entry)).sort().join("|");
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

function normalizeText(value: unknown): string {
  return isBlank(value) ? "" : toPlainText(value);
}

function normalizeDate(value: unknown): string {
  return isBlank(value) ? "" : String(value).slice(0, 10);
}

function formatScalar(value: unknown): string {
  if (isBlank(value)) return EMPTY_VALUE;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return truncate(String(value));
}

function formatText(value: unknown): string {
  if (isBlank(value)) return EMPTY_VALUE;
  const plain = truncate(toPlainText(value));
  return plain === "" ? EMPTY_VALUE : plain;
}

function formatDate(value: unknown): string {
  if (isBlank(value) || typeof value !== "string") return EMPTY_VALUE;
  const formatted = formatShortDate(value.slice(0, 10));
  return formatted === "" ? EMPTY_VALUE : formatted;
}

function formatNamedId(value: unknown, entries: NameEntry[]): string {
  if (isBlank(value)) return EMPTY_VALUE;
  const match = entries.find((entry) => entry.id === value);
  return match ? match.name : `#${String(value)}`;
}

function formatMember(value: unknown, members: { id: string; name: string }[]): string {
  if (isBlank(value)) return EMPTY_VALUE;
  const match = members.find((member) => member.id === value);
  return match && match.name !== "" ? match.name : UNKNOWN_MEMBER;
}

function formatMemberList(value: unknown, members: { id: string; name: string }[]): string {
  if (isBlank(value)) return EMPTY_VALUE;
  const ids = Array.isArray(value) ? value : [value];
  return truncate(ids.map((id) => formatMember(id, members)).join(", "));
}

function readServerAssigneeIds(ticket: Ticket): string[] {
  if (Array.isArray(ticket.assignees)) return ticket.assignees.map((entry) => entry.userId);
  const single = ticket.assignee?.id ?? ticket.assigneeId;
  return single ? [single] : [];
}

function readServerAssigneeId(ticket: Ticket): string | null {
  return readServerAssigneeIds(ticket)[0] ?? null;
}

function readUnknownField(ticket: Ticket, key: string): unknown {
  return isRecord(ticket) ? ticket[key] : undefined;
}

function humanizeKey(key: string): string {
  const spaced = key.replace(/([A-Z])/g, " $1").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}

interface ConflictFieldSpec {
  label: string;
  readServer: (ticket: Ticket) => unknown;
  normalize: (value: unknown) => string;
  format: (value: unknown, lookups: TicketConflictNameLookups) => string;
}

type ServerReader = (ticket: Ticket) => unknown;

function scalarSpec(label: string, readServer: ServerReader): ConflictFieldSpec {
  return { label, readServer, normalize: normalizeDefault, format: formatScalar };
}

function dateSpec(label: string, readServer: ServerReader): ConflictFieldSpec {
  return { label, readServer, normalize: normalizeDate, format: formatDate };
}

function namedIdSpec(
  label: string,
  readServer: ServerReader,
  pick: (lookups: TicketConflictNameLookups) => NameEntry[],
): ConflictFieldSpec {
  return {
    label,
    readServer,
    normalize: normalizeDefault,
    format: (value, lookups) => formatNamedId(value, pick(lookups)),
  };
}

const FIELD_SPECS: Record<string, ConflictFieldSpec | undefined> = {
  title: scalarSpec("Title", (ticket) => ticket.title),
  description: {
    label: "Description",
    readServer: (ticket) => ticket.description,
    normalize: normalizeText,
    format: formatText,
  },
  status: scalarSpec("Status", (ticket) => ticket.status),
  priority: scalarSpec("Priority", (ticket) => ticket.priority),
  type: scalarSpec("Type", (ticket) => ticket.type),
  points: scalarSpec("Points", (ticket) => ticket.points),
  estimate: scalarSpec("Estimate", (ticket) => ticket.estimate),
  originalEstimate: scalarSpec("Original estimate", (ticket) => ticket.originalEstimate),
  link: scalarSpec("Link", (ticket) => ticket.link),
  startDate: dateSpec("Start date", (ticket) => ticket.startDate),
  dueDate: dateSpec("Due date", (ticket) => ticket.dueDate),
  epicId: namedIdSpec("Epic", (ticket) => ticket.epicId, (lookups) => lookups.epics),
  moduleId: namedIdSpec("Module", (ticket) => ticket.moduleId, (lookups) => lookups.modules),
  cycleId: namedIdSpec("Cycle", (ticket) => ticket.cycleId, (lookups) => lookups.cycles),
  customerId: namedIdSpec(
    "Customer",
    (ticket) => ticket.customerId ?? null,
    (lookups) => lookups.customers,
  ),
  parentTicketId: {
    label: "Parent issue",
    readServer: (ticket) => ticket.parentTicketId,
    normalize: normalizeDefault,
    format: (value) => (isBlank(value) ? EMPTY_VALUE : `#${String(value)}`),
  },
  assigneeId: {
    label: "Assignee",
    readServer: readServerAssigneeId,
    normalize: normalizeDefault,
    format: (value, lookups) => formatMember(value, lookups.members),
  },
  assigneeIds: {
    label: "Assignees",
    readServer: readServerAssigneeIds,
    normalize: normalizeDefault,
    format: (value, lookups) => formatMemberList(value, lookups.members),
  },
};

function toNameEntries(value: unknown): NameEntry[] {
  if (!Array.isArray(value)) return [];
  const entries: NameEntry[] = [];
  for (const item of value) {
    if (!isRecord(item)) continue;
    const id = item.id;
    const name =
      typeof item.name === "string"
        ? item.name
        : typeof item.title === "string"
          ? item.title
          : null;
    if (typeof id === "number" && name !== null) entries.push({ id, name });
  }
  return entries;
}

export interface TicketConflictNameSources {
  members?: { id: string; name: string }[];
  epics?: unknown;
  modules?: unknown;
  cycles?: unknown;
}

function buildLookups(
  sources: TicketConflictNameSources,
  serverTicket: Ticket,
): TicketConflictNameLookups {
  const cycles = toNameEntries(sources.cycles);
  const nestedCycle = serverTicket.cycle;
  if (nestedCycle && !cycles.some((entry) => entry.id === nestedCycle.id)) {
    cycles.push({ id: nestedCycle.id, name: nestedCycle.name });
  }
  const customers: NameEntry[] = [];
  const nestedCustomer = serverTicket.customer;
  if (nestedCustomer) customers.push({ id: nestedCustomer.id, name: nestedCustomer.name });
  return {
    members: sources.members ?? [],
    epics: toNameEntries(sources.epics),
    modules: toNameEntries(sources.modules),
    cycles,
    customers,
  };
}

export function diffTicketConflictFields(
  pendingPatch: Record<string, unknown>,
  serverTicket: Ticket,
  sources: TicketConflictNameSources,
): TicketConflictFieldDiff[] {
  const lookups = buildLookups(sources, serverTicket);
  const keys = Object.keys(pendingPatch).filter((key) => !SKIPPED_KEYS.has(key));
  const comparable = keys.includes("assigneeIds")
    ? keys.filter((key) => key !== "assigneeId")
    : keys;
  const diffs: TicketConflictFieldDiff[] = [];
  for (const key of comparable) {
    const spec = FIELD_SPECS[key];
    const pendingValue = pendingPatch[key];
    const serverValue = spec ? spec.readServer(serverTicket) : readUnknownField(serverTicket, key);
    const normalize = spec ? spec.normalize : normalizeDefault;
    if (normalize(serverValue) === normalize(pendingValue)) continue;
    const format = spec ? spec.format : formatScalar;
    diffs.push({
      key,
      label: spec ? spec.label : humanizeKey(key),
      serverValue: format(serverValue, lookups),
      pendingValue: format(pendingValue, lookups),
    });
  }
  return diffs;
}
