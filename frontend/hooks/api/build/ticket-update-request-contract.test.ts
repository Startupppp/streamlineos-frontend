import { ticketUpdateRequestContract } from "./build-tickets-subresource-schema";

const versionedEdit = { status: "IN_PROGRESS", version: 4 };

it("rejects a ticket edit that omits the version token", () => {
  expect(ticketUpdateRequestContract.safeParse({ status: "IN_PROGRESS" }).success).toBe(false);
});

it("accepts the same ticket edit once the version token is present", () => {
  expect(ticketUpdateRequestContract.safeParse(versionedEdit).success).toBe(true);
});

it("rejects a version token that is not an integer or not a number", () => {
  expect(ticketUpdateRequestContract.safeParse({ ...versionedEdit, version: 1.5 }).success).toBe(
    false,
  );
  expect(
    ticketUpdateRequestContract.safeParse({ ...versionedEdit, version: "4" }).success,
  ).toBe(false);
});

it("rejects version 0 because the generated contract requires a positive integer matching the database default of 1", () => {
  expect(ticketUpdateRequestContract.safeParse({ ...versionedEdit, version: 0 }).success).toBe(
    false,
  );
});

it("rejects an undeclared field rather than stripping it, because the backend body schema is strict", () => {
  expect(
    ticketUpdateRequestContract.safeParse({ ...versionedEdit, labelIds: [1] }).success,
  ).toBe(false);
});

it("accepts the stale-write guard alongside the version token", () => {
  expect(
    ticketUpdateRequestContract.safeParse({
      ...versionedEdit,
      expectedUpdatedAt: "2026-09-15T10:00:00.000Z",
    }).success,
  ).toBe(true);
});

it("accepts every core field the issue detail page edits", () => {
  const result = ticketUpdateRequestContract.safeParse({
    version: 9,
    title: "A retitled issue",
    description: "<p>body</p>",
    type: "BUG",
    status: "IN_REVIEW",
    priority: "URGENT",
    assigneeIds: ["user-1"],
    epicId: 3,
    moduleId: 4,
    cycleId: 5,
    points: 8,
    originalEstimate: 2.5,
    startDate: "2026-09-01",
    dueDate: "2026-09-30",
    parentTicketId: 11,
    customerId: 12,
  });
  expect(result.success).toBe(true);
});
