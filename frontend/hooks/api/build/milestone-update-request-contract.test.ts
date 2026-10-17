import { milestoneUpdateRequestContract } from "./workspace-schema";

const versionedEdit = { status: "ACHIEVED", version: 4 };

it("rejects a milestone edit that omits the version token", () => {
  expect(milestoneUpdateRequestContract.safeParse({ status: "ACHIEVED" }).success).toBe(false);
});

it("accepts the same milestone edit once the version token is present", () => {
  expect(milestoneUpdateRequestContract.safeParse(versionedEdit).success).toBe(true);
});

it("rejects a version token that is not a positive integer", () => {
  expect(milestoneUpdateRequestContract.safeParse({ ...versionedEdit, version: 0 }).success).toBe(
    false,
  );
  expect(milestoneUpdateRequestContract.safeParse({ ...versionedEdit, version: 1.5 }).success).toBe(
    false,
  );
  expect(
    milestoneUpdateRequestContract.safeParse({ ...versionedEdit, version: "4" }).success,
  ).toBe(false);
});

it("rejects an undeclared field rather than stripping it, because the backend body schema is strict", () => {
  expect(
    milestoneUpdateRequestContract.safeParse({ ...versionedEdit, clientVisible: true }).success,
  ).toBe(false);
});

it("accepts every field the milestone upsert sheet edits", () => {
  const result = milestoneUpdateRequestContract.safeParse({
    version: 9,
    name: "Beta rollout",
    description: "Cut over the last tenant",
    targetDate: "2026-12-15",
    status: "MISSED",
  });
  expect(result.success).toBe(true);
});

it("rejects a target date that is not the backend's calendar-date format", () => {
  expect(
    milestoneUpdateRequestContract.safeParse({
      ...versionedEdit,
      targetDate: "2026-12-15T00:00:00.000Z",
    }).success,
  ).toBe(false);
});
