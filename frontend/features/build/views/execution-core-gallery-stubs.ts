import type { KanbanTicket } from "@/features/build/shared/types";
import type { Ticket, Cycle, Module } from "@/types/projects";

export const STUB_STATUSES = [
  { id: 1, name: "TODO" },
  { id: 2, name: "IN_PROGRESS" },
  { id: 3, name: "IN_REVIEW" },
  { id: 4, name: "DONE" },
  { id: 5, name: "CANCELLED" },
];

export const STUB_EPICS = [
  { id: 1, title: "Platform foundation" },
  { id: 2, title: "Analytics v2" },
];

export const STUB_MODULES = [
  { id: 1, name: "Core" },
  { id: 2, name: "Billing" },
];

export const STUB_CYCLES = [
  { id: 1, name: "Sprint 42", status: "active" },
  { id: 2, name: "Sprint 43", status: "planned" },
];

const STUB_TICKET: KanbanTicket & { id: number } = {
  id: 42,
  title: "Implement token-refresh flow for idle sessions",
  type: "STORY",
  status: "IN_PROGRESS",
  priority: "HIGH",
  ticketNumber: 42,
  sequenceId: "PROJ-42",
  points: 5,
  storyPoints: null,
  assigneeId: null,
  epicId: null,
  cycleId: null,
  moduleId: null,
  rank: "1000",
  version: 1,
  dueDate: "2026-10-15",
  startDate: null,
  createdAt: "2026-09-01",
  updatedAt: "2026-09-20",
  assignees: [],
};

const STUB_TICKET_B: KanbanTicket & { id: number } = {
  ...STUB_TICKET,
  id: 43,
  title: "Add rate-limit error state to the onboarding wizard",
  ticketNumber: 43,
  sequenceId: "PROJ-43",
  status: "TODO",
  priority: "MEDIUM",
};

const STUB_TICKET_C: KanbanTicket & { id: number } = {
  ...STUB_TICKET,
  id: 44,
  title: "Expose cursor-based pagination for /api/tickets",
  ticketNumber: 44,
  sequenceId: "PROJ-44",
  status: "DONE",
  priority: "LOW",
};

export const COLUMNS = [
  { status: "TODO", tickets: [STUB_TICKET_B, { ...STUB_TICKET, id: 45, title: "Sync assignee avatar in real-time", ticketNumber: 45, sequenceId: "PROJ-45", status: "TODO" }] },
  { status: "IN_PROGRESS", tickets: [STUB_TICKET, { ...STUB_TICKET, id: 46, title: "Debounce search on ticket board", ticketNumber: 46, sequenceId: "PROJ-46", status: "IN_PROGRESS" }] },
  { status: "IN_REVIEW", tickets: [{ ...STUB_TICKET, id: 47, title: "Add stale-while-revalidate for cycles hook", ticketNumber: 47, sequenceId: "PROJ-47", status: "IN_REVIEW" }] },
  { status: "DONE", tickets: [STUB_TICKET_C] },
  { status: "CANCELLED", tickets: [{ ...STUB_TICKET, id: 48, title: "Migrate legacy sort params", ticketNumber: 48, sequenceId: "PROJ-48", status: "CANCELLED", priority: "LOW" }] },
];

export const STUB_FULL_TICKET: Ticket = {
  id: 101,
  orgId: "org-1",
  title: "Add rate-limit error state to onboarding wizard",
  type: "STORY",
  status: "IN_PROGRESS",
  priority: "HIGH",
  projectId: 1,
  ticketNumber: 101,
  epicId: 1,
  reporterId: null,
  points: 5,
  storyPoints: null,
  link: null,
  rank: "1000",
  parentTicketId: null,
  originalEstimate: null,
  timeSpent: null,
  moduleId: null,
  cycleId: null,
  sequenceId: "PROJ-101",
  estimate: null,
  version: 1,
  startDate: null,
  dueDate: "2026-10-31",
  createdAt: "2026-09-01",
  updatedAt: "2026-09-20",
};

export const STUB_TRIAGE_TICKET_B: Ticket = {
  ...STUB_FULL_TICKET,
  id: 102,
  title: "Expose cursor-based pagination for /api/tickets",
  ticketNumber: 102,
  sequenceId: "PROJ-102",
  priority: "LOW",
  status: "TODO",
};

export const STUB_CYCLE_ACTIVE: Cycle = {
  id: 1,
  projectId: 1,
  orgId: "org-1",
  name: "Sprint 42",
  description: null,
  goal: null,
  capacity: null,
  version: 1,
  status: "active",
  startDate: "2026-09-01",
  endDate: "2026-09-30",
  createdBy: "user-1",
  createdAt: "2026-09-01",
  updatedAt: "2026-09-01",
  totalItems: 8,
  completedItems: 5,
  progress: 62,
};

export const STUB_CYCLE_PLANNED: Cycle = {
  ...STUB_CYCLE_ACTIVE,
  id: 2,
  name: "Sprint 43",
  status: "draft",
  startDate: "2026-10-01",
  endDate: "2026-10-31",
  completedItems: 0,
  progress: 0,
};

export const STUB_MODULE_A: Module = {
  id: 1,
  projectId: 1,
  orgId: "org-1",
  name: "Core Platform",
  description: "Foundation services and authentication",
  status: "in-progress",
  leadId: null,
  startDate: "2026-01-01",
  endDate: "2026-12-31",
  createdBy: "user-1",
  createdAt: "2026-01-01",
  updatedAt: "2026-09-01",
  version: 1,
  progress: 65,
};

export const STUB_MODULE_B: Module = {
  ...STUB_MODULE_A,
  id: 2,
  name: "Billing Module",
  description: "Payment flows and subscription management",
  status: "planned",
  progress: 0,
};
