import {
  projectAutomationListContract,
  projectReleaseRowContract,
  projectCustomStateListContract,
} from "@/hooks/api/build/build-project-schema";

const AUTOMATION = {
  id: 1,
  projectId: 3,
  name: "Auto-assign bugs",
  isActive: true,
  triggerEvent: "ticket.created",
  conditions: [{ field: "type", operator: "equals", value: "BUG" }],
  actions: [{ type: "set_assignee", value: "user-1" }],
  createdAt: "2026-09-15T10:00:00.000Z",
  updatedAt: "2026-09-15T10:00:00.000Z",
};

const RELEASE = {
  id: 5,
  projectId: 3,
  name: "v1.2",
  version: "1.2.0",
  description: null,
  status: "draft",
  releaseDate: null,
  ticketCount: 0,
  createdAt: "2026-09-15T10:00:00.000Z",
  updatedAt: "2026-09-15T10:00:00.000Z",
};

const CUSTOM_STATE = {
  id: 9,
  orgId: "org-1",
  projectId: 3,
  name: "Triage",
  color: "#888888",
  order: 1,
  type: "unstarted",
  wipLimit: null,
};

describe("automation list rows carry what the card renders", () => {
  it("parses a row with its conditions and actions", () => {
    const parsed = projectAutomationListContract.parse([AUTOMATION]);

    expect(parsed[0].conditions).toHaveLength(1);
    expect(parsed[0].actions).toHaveLength(1);
    expect(parsed[0].projectId).toBe(3);
  });

  it("parses an automation with no conditions", () => {
    const parsed = projectAutomationListContract.parse([{ ...AUTOMATION, conditions: [] }]);

    expect(parsed[0].conditions).toEqual([]);
  });
});

describe("a created release has no ticket count to report yet", () => {
  it("parses a freshly created release", () => {
    expect(projectReleaseRowContract.parse(RELEASE).ticketCount).toBe(0);
  });

  it("parses a release that already has tickets", () => {
    expect(projectReleaseRowContract.parse({ ...RELEASE, ticketCount: 7 }).ticketCount).toBe(7);
  });
});

describe("custom state type accepts every value the state_group column can hold", () => {
  it.each(["backlog", "unstarted", "started", "completed", "cancelled"])(
    "accepts %s",
    (type) => {
      expect(projectCustomStateListContract.parse([{ ...CUSTOM_STATE, type }])[0].type).toBe(type);
    },
  );

  it("accepts a null type, which the nullable column allows", () => {
    expect(projectCustomStateListContract.parse([{ ...CUSTOM_STATE, type: null }])[0].type).toBeNull();
  });

  it("accepts an absent type", () => {
    const { type: _type, ...withoutType } = CUSTOM_STATE;

    expect(() => projectCustomStateListContract.parse([withoutType])).not.toThrow();
  });
});
