import {
  istDayKey,
  markDeadlineAffected,
  normaliseLeaveItem,
  normaliseRegularizationItem,
  normaliseWfhItem,
  normaliseWorkflowItem,
} from "./normalise-queue";
import {
  filterQueueItems,
  sharedBulkGroup,
  sortQueueItems,
} from "./queue-item";

describe("normaliseLeaveItem", () => {
  it("names the leave type, the requester and the day range", () => {
    const item = normaliseLeaveItem({
      id: 41,
      userId: "usr-member",
      startDate: "2026-10-05",
      endDate: "2026-10-06",
      leaveType: { name: "Casual Leave" },
      user: { id: "usr-member", name: "QA RoleMember" },
      createdAt: "2026-10-01T09:00:00.000Z",
    });

    expect(item.id).toBe("leave:41");
    expect(item.facet).toBe("leave");
    expect(item.type).toBe("Casual Leave");
    expect(item.requesterLabel).toBe("QA RoleMember");
    expect(item.requester?.userId).toBe("usr-member");
    expect(item.dateRange).toBe("Oct 5 – Oct 6");
    expect(item.startDay).toBe("2026-10-05");
  });

  it("does not read a single day as a range and marks a half day", () => {
    const item = normaliseLeaveItem({
      id: 42,
      userId: "usr-member",
      startDate: "2026-10-05",
      endDate: "2026-10-05",
      isHalfDay: true,
    });

    expect(item.dateRange).toBe("Oct 5 (half day)");
    expect(item.type).toBe("Leave");
    expect(item.requester).toBeNull();
  });

  it("states the LOP risk qualitatively and names the routing target", () => {
    const item = normaliseLeaveItem({
      id: 43,
      userId: "usr-member",
      startDate: "2026-10-05",
      endDate: "2026-10-05",
      lopDays: "1.0",
      approvalRoute: { rung: "queue", queue: { label: "the HR approvals queue" } },
    });

    expect(item.policyNote).toBe(
      "May affect LOP · Routed to the HR approvals queue",
    );
  });

  it("carries no note when the backend sent no route and no LOP", () => {
    const item = normaliseLeaveItem({
      id: 44,
      userId: "usr-member",
      startDate: "2026-10-05",
      endDate: "2026-10-05",
      lopDays: "0.0",
    });

    expect(item.policyNote).toBeNull();
  });

  it("survives an unparseable date instead of throwing inside a list", () => {
    const item = normaliseLeaveItem({
      id: 45,
      userId: "usr-member",
      startDate: "not-a-date",
      endDate: "not-a-date",
    });

    expect(item.dateRange).toBe("not-a-date");
    expect(item.startDay).toBeNull();
  });
});

describe("normaliseWfhItem", () => {
  it("renders one day and keeps the requester's own name", () => {
    const item = normaliseWfhItem({
      id: 7,
      userId: "usr-ben",
      date: "2026-10-07",
      reason: "Clinic appointment",
      createdAt: "2026-10-01T09:00:00.000Z",
      user: {
        id: "usr-ben",
        firstName: "Ben",
        lastName: "Rao",
        email: "ben@example.test",
        image: null,
      },
    });

    expect(item.id).toBe("wfh:7");
    expect(item.facet).toBe("wfh");
    expect(item.type).toBe("Work from home");
    expect(item.requesterLabel).toBe("Ben Rao");
    expect(item.dateRange).toBe("Oct 7");
    expect(item.policyNote).toBe("Clinic appointment");
  });
});

describe("normaliseRegularizationItem", () => {
  const regularization = {
    id: 3,
    userId: "usr-asha",
    attendanceDate: "2026-10-02",
    reason: "Forgot to check out",
    createdAt: "2026-10-02T13:00:00.000Z",
  };

  it("names the person when the scoped directory holds them", () => {
    const directory = new Map([
      [
        "usr-asha",
        {
          userId: "usr-asha",
          name: "Asha Menon",
          email: "asha@alpha.test",
          designation: "Ops Associate",
        },
      ],
    ]);

    const item = normaliseRegularizationItem(regularization, directory);

    expect(item.requesterLabel).toBe("Asha Menon");
    expect(item.requester?.userId).toBe("usr-asha");
  });

  it("falls back to Employee rather than inventing a name the endpoint never sent", () => {
    const item = normaliseRegularizationItem(regularization, new Map());

    expect(item.requester).toBeNull();
    expect(item.requesterLabel).toBe("Employee");
  });

  it("names no person, because the list endpoint sends none", () => {
    const item = normaliseRegularizationItem({
      id: 3,
      userId: "usr-asha",
      attendanceDate: "2026-10-02",
      reason: "Forgot to check out",
      createdAt: "2026-10-02T13:00:00.000Z",
    });

    expect(item.facet).toBe("attendance");
    expect(item.requester).toBeNull();
    expect(item.requesterLabel).toBe("Employee");
    expect(item.startDay).toBe("2026-10-02");
  });
});

describe("normaliseWorkflowItem", () => {
  it("labels the object type and never reads money out of the context", () => {
    const item = normaliseWorkflowItem({
      id: 9,
      objectType: "expense_reimbursement",
      requestedBy: "usr-ben",
      currentStepOrder: 2,
      createdAt: "2026-09-30T09:00:00.000Z",
      requester: { id: "usr-ben", name: "Ben Rao" },
    });

    expect(item.facet).toBe("other");
    expect(item.type).toBe("Expense Reimbursement");
    expect(item.dateRange).toBe("Step 2");
    expect(item.startDay).toBeNull();
    expect(JSON.stringify(item)).not.toMatch(/amount|₹|currency/i);
  });
});

describe("markDeadlineAffected", () => {
  const items = [
    normaliseLeaveItem({
      id: 1,
      userId: "u1",
      startDate: "2026-10-05",
      endDate: "2026-10-05",
    }),
    normaliseLeaveItem({
      id: 2,
      userId: "u2",
      startDate: "2026-10-30",
      endDate: "2026-10-30",
    }),
    normaliseWorkflowItem({
      id: 3,
      objectType: "asset_request",
      requestedBy: "u3",
      currentStepOrder: 1,
      createdAt: "2026-10-01T00:00:00.000Z",
    }),
  ];

  it("marks only the requests on or before a real cutoff day", () => {
    const marked = markDeadlineAffected(items, "2026-10-25T00:00:00.000Z");

    expect(marked.map((item) => item.deadlineAffected)).toEqual([
      true,
      false,
      false,
    ]);
  });

  it("invents no deadline when no cycle is configured", () => {
    const marked = markDeadlineAffected(items, null);

    expect(marked.every((item) => !item.deadlineAffected)).toBe(true);
  });
});

describe("istDayKey", () => {
  it("keeps a plain calendar day and converts an instant in IST", () => {
    expect(istDayKey("2026-10-05")).toBe("2026-10-05");
    expect(istDayKey("2026-10-05T19:30:00.000Z")).toBe("2026-10-06");
    expect(istDayKey(null)).toBeNull();
    expect(istDayKey("nonsense")).toBeNull();
  });
});

describe("selection and filtering", () => {
  const leaveA = normaliseLeaveItem({
    id: 1,
    userId: "u1",
    startDate: "2026-10-05",
    endDate: "2026-10-05",
    leaveType: { name: "Casual Leave" },
  });
  const leaveB = normaliseLeaveItem({
    id: 2,
    userId: "u2",
    startDate: "2026-10-06",
    endDate: "2026-10-06",
    leaveType: { name: "Casual Leave" },
  });
  const wfh = normaliseWfhItem({ id: 3, userId: "u3", date: "2026-10-07" });

  it("allows bulk only when every row shares one source and type", () => {
    expect(sharedBulkGroup([leaveA, leaveB])).toBe("leave:Casual Leave");
    expect(sharedBulkGroup([leaveA, wfh])).toBeNull();
    expect(sharedBulkGroup([])).toBeNull();
  });

  it("filters by type facet and by the cutoff facet", () => {
    const marked = markDeadlineAffected([leaveA, leaveB, wfh], "2026-10-05");

    expect(
      filterQueueItems(marked, { facet: "wfh", onlyCutoff: false }),
    ).toHaveLength(1);
    expect(
      filterQueueItems(marked, { facet: "all", onlyCutoff: true }),
    ).toHaveLength(1);
  });

  it("puts cutoff-affecting rows first", () => {
    const marked = markDeadlineAffected([wfh, leaveB, leaveA], "2026-10-05");

    expect(sortQueueItems(marked)[0].id).toBe("leave:1");
  });
});
