import { mapBoardTicketToKanban } from "./map-board-ticket";
import type { Ticket } from "@/types/projects/tasks";

const base: Ticket = {
  id: 1,
  orgId: "org-1",
  title: "Ticket",
  type: "BUG",
  status: "OPEN",
  priority: "HIGH",
  projectId: 42,
  ticketNumber: 1,
  epicId: null,
  reporterId: null,
  points: null,
  storyPoints: null,
  link: null,
  rank: "a0",
  parentTicketId: null,
  originalEstimate: null,
  timeSpent: "0",
  startDate: null,
  dueDate: null,
  moduleId: null,
  cycleId: null,
  sequenceId: null,
  estimate: null,
  createdAt: "2026-09-09T00:00:00Z",
  updatedAt: "2026-09-09T00:00:00Z",
};

it("carries descriptionExcerpt onto the board card, so the API's per-row excerpt is not computed and then dropped", () => {
  const card = mapBoardTicketToKanban({
    ...base,
    descriptionExcerpt: "A short plain-text excerpt of the ticket body",
  });

  expect(card.descriptionExcerpt).toBe("A short plain-text excerpt of the ticket body");
});

it("renders no excerpt rather than undefined when an API build predates the descriptionExcerpt projection", () => {
  const card = mapBoardTicketToKanban({ ...base, descriptionExcerpt: undefined });

  expect(card.descriptionExcerpt).toBeNull();
});
