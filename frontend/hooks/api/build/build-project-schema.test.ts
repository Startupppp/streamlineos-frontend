import { ZodError } from "zod";

import {
  ticketFieldValueCreateContract,
  projectMemberRowContract,
} from "./build-project-schema";

it("accepts the bare success ack the upsert-ticket-values endpoint actually returns, never an id", () => {
  const result = ticketFieldValueCreateContract.parse({ success: true });

  expect(result).toEqual({ success: true });
});

it("rejects a falsy success flag on the ticket field value create contract", () => {
  expect(() =>
    ticketFieldValueCreateContract.parse({ success: false }),
  ).toThrow(ZodError);
});

it("accepts the raw project_members row the add-member endpoint returns with no userId column", () => {
  const result = projectMemberRowContract.parse({
    id: 1,
    orgId: "org-1",
    projectId: 5,
    membershipId: 9,
    role: "MEMBER",
    hourlyRate: "0",
    hourlyRateMinor: 0,
    rateCurrency: null,
    joinedAt: "2026-09-15T00:00:00.000Z",
  });

  expect(result.userId).toBeUndefined();
});

it("still accepts a fuller project member row that does carry userId", () => {
  const result = projectMemberRowContract.parse({
    id: 1,
    orgId: "org-1",
    projectId: 5,
    membershipId: 9,
    userId: "user-1",
    role: "MEMBER",
    hourlyRate: "0",
    hourlyRateMinor: 0,
    rateCurrency: null,
    joinedAt: "2026-09-15T00:00:00.000Z",
  });

  expect(result.userId).toBe("user-1");
});

it("rejects a project member row with a non-numeric membershipId", () => {
  expect(() =>
    projectMemberRowContract.parse({
      id: 1,
      orgId: "org-1",
      projectId: 5,
      membershipId: "nine",
      role: "MEMBER",
      hourlyRate: "0",
      hourlyRateMinor: 0,
      rateCurrency: null,
      joinedAt: "2026-09-15T00:00:00.000Z",
    }),
  ).toThrow(ZodError);
});
