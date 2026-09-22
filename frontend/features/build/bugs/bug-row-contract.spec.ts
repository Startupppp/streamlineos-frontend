import { bugRowContract } from "@/hooks/api/build/qa-schema";

const REALISTIC_BACKEND_PAYLOAD = {
  id: 1,
  orgId: "org-abc",
  projectId: 10,
  ticketNumber: 42,
  title: "Login form crashes on Safari",
  description: "Steps: open Safari, navigate to /login, submit form.",
  type: "BUG" as const,
  status: "IN_PROGRESS",
  priority: "HIGH" as const,
  assigneeMembershipId: 7,
  reporterId: "user-xyz",
  deletedAt: null,
  createdAt: "2026-09-01T10:00:00.000Z",
  updatedAt: "2026-09-15T14:30:00.000Z",
  qaState: "in_progress" as const,
  severity: "critical" as const,
  stepsToReproduce: "1. Open Safari\n2. Submit login form",
  expectedResult: "User is redirected to dashboard",
  actualResult: "Page crashes with TypeError",
  environment: "production",
  browserDevice: "Safari 17 / macOS Sonoma",
  affectedReleaseId: 3,
  fixedReleaseId: null,
  qaOwnerUserId: "user-qa-1",
  qaOwnerMembershipId: 9,
  linkedTestCaseId: 15,
  reopenCount: 1,
  createdByUserId: "user-reporter",
};

it("decodes a realistic backend bugRowSchema payload through the frontend contract — fields must match exactly", () => {
  const result = bugRowContract.safeParse(REALISTIC_BACKEND_PAYLOAD);
  expect(result.success).toBe(true);
  if (!result.success) return;

  expect(result.data.ticketNumber).toBe(42);
  expect(result.data.type).toBe("BUG");
  expect(result.data.priority).toBe("HIGH");
  expect(result.data.qaState).toBe("in_progress");
  expect(result.data.severity).toBe("critical");
  expect(result.data.qaOwnerUserId).toBe("user-qa-1");
  expect(result.data.createdByUserId).toBe("user-reporter");
  expect(result.data.reopenCount).toBe(1);
});

it("mutation guard — removing ticketNumber from the payload causes contract parse to fail", () => {
  const { ticketNumber: _removed, ...withoutTicketNumber } = REALISTIC_BACKEND_PAYLOAD;
  const result = bugRowContract.safeParse(withoutTicketNumber);
  expect(result.success).toBe(false);
});

it("mutation guard — using old bugNumber field instead of ticketNumber fails the contract", () => {
  const { ticketNumber: _removed, ...rest } = REALISTIC_BACKEND_PAYLOAD;
  const withBugNumber = { ...rest, bugNumber: 42 };
  const result = bugRowContract.safeParse(withBugNumber);
  expect(result.success).toBe(false);
});

it("mutation guard — lowercase priority (legacy format) fails the UPPER-case contract", () => {
  const payload = { ...REALISTIC_BACKEND_PAYLOAD, priority: "high" };
  const result = bugRowContract.safeParse(payload);
  expect(result.success).toBe(false);
});

it("mutation guard — enum status string (old 9-value format) passes as z.string() so any project status name is accepted", () => {
  const withProjectStatus = { ...REALISTIC_BACKEND_PAYLOAD, status: "TODO" };
  const result = bugRowContract.safeParse(withProjectStatus);
  expect(result.success).toBe(true);
  if (!result.success) return;
  expect(result.data.status).toBe("TODO");
});

it("accepts null sidecar fields — left-join row where sidecar was not yet populated", () => {
  const sparsePayload = {
    ...REALISTIC_BACKEND_PAYLOAD,
    qaState: null,
    severity: null,
    reopenCount: null,
    qaOwnerUserId: null,
    createdByUserId: null,
  };
  const result = bugRowContract.safeParse(sparsePayload);
  expect(result.success).toBe(true);
});
