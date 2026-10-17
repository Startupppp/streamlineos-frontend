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

describe("ticketRowContract — create response may omit storyPoints/estimate", () => {
  it("parses a live create payload without storyPoints/estimate", () => {
    const parsed = ticketRowContract.parse(BASE);
    expect(parsed.storyPoints).toBeNull();
    expect(parsed.estimate).toBeNull();
  });

  it("still accepts explicit null aliases", () => {
    const parsed = ticketRowContract.parse({
      ...BASE,
      storyPoints: null,
      estimate: null,
    });
    expect(parsed.storyPoints).toBeNull();
    expect(parsed.estimate).toBeNull();
  });
});
