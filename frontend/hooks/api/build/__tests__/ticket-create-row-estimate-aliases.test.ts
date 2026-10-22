import { ticketRowContract } from "@/hooks/api/build/build-tickets-core-schema";

const BASE = {
  id: 99,
  orgId: "org-1",
  title: "Created ticket",
  description: null,
  type: "TASK" as const,
  status: "TODO",
  priority: "MEDIUM" as const,
  projectId: 29,
  ticketNumber: 5,
  epicId: null,
  assigneeMembershipId: null,
  reporterId: "user-1",
  reporterMembershipId: null,
  points: null,
  link: null,
  rank: "1000",
  parentTicketId: null,
  originalEstimate: null,
  startDate: null,
  dueDate: null,
  moduleId: null,
  cycleId: null,
  milestoneId: null,
  sequenceId: null,
  completionPercentage: 0,
  clientVisible: false,
  isRecurring: false,
  recurrenceRule: null,
  recurrenceParentId: null,
  recurrenceNextRunAt: null,
  health: null,
  customerId: null,
  version: 1,
  deletedAt: null,
  createdAt: "2026-10-06T12:08:40.436Z",
  updatedAt: "2026-10-06T12:08:40.436Z",
  timeSpent: "0",
};

describe("ticketRowContract — create response estimate field", () => {
  it("parses a live create payload without estimate and defaults to null", () => {
    const parsed = ticketRowContract.parse(BASE);
    expect(parsed.estimate).toBeNull();
  });

  it("preserves an explicit estimate value from the server response", () => {
    const parsed = ticketRowContract.parse({ ...BASE, estimate: 5 });
    expect(parsed.estimate).toBe(5);
  });
});
