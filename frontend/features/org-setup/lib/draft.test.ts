import {
  setCompletionMarker,
  hasCompletionMarker,
  getCompletionDestination,
  clearCompletionMarker,
  clearAll,
  saveDraft,
  loadDraft,
  saveStep,
  loadStep,
  mergeServerDraft,
  syncDraftToServer,
  type SyncStatus,
} from "./draft";

const USER_A = "user-aaa";
const USER_B = "user-bbb";
const ORG_X = "org-xxx";
const ORG_Y = "org-yyy";

function clearStorage() {
  localStorage.clear();
  sessionStorage.clear();
}

beforeEach(clearStorage);
afterEach(clearStorage);

describe("setCompletionMarker / hasCompletionMarker — scoped by userId + orgId", () => {
  it("ANTI-VACUITY: sessionStorage is writable in jsdom", () => {
    sessionStorage.setItem("probe", "1");
    expect(sessionStorage.getItem("probe")).toBe("1");
    sessionStorage.removeItem("probe");
    expect(sessionStorage.getItem("probe")).toBeNull();
  });

  it("reads true for the exact userId + orgId pair that was written", () => {
    setCompletionMarker(USER_A, ORG_X);
    expect(hasCompletionMarker(USER_A, ORG_X)).toBe(true);
  });

  it("reads false for a different userId, same orgId", () => {
    setCompletionMarker(USER_A, ORG_X);
    expect(hasCompletionMarker(USER_B, ORG_X)).toBe(false);
  });

  it("reads false for same userId, different orgId", () => {
    setCompletionMarker(USER_A, ORG_X);
    expect(hasCompletionMarker(USER_A, ORG_Y)).toBe(false);
  });

  it("reads false for both userId and orgId different", () => {
    setCompletionMarker(USER_A, ORG_X);
    expect(hasCompletionMarker(USER_B, ORG_Y)).toBe(false);
  });

  it("two distinct markers coexist independently", () => {
    setCompletionMarker(USER_A, ORG_X);
    setCompletionMarker(USER_B, ORG_Y);
    expect(hasCompletionMarker(USER_A, ORG_X)).toBe(true);
    expect(hasCompletionMarker(USER_B, ORG_Y)).toBe(true);
    expect(hasCompletionMarker(USER_A, ORG_Y)).toBe(false);
    expect(hasCompletionMarker(USER_B, ORG_X)).toBe(false);
  });

  it("returns false when userId is empty", () => {
    sessionStorage.setItem("org-setup-complete----org-x", "1");
    expect(hasCompletionMarker("", "org-x")).toBe(false);
  });

  it("returns false when orgId is empty", () => {
    sessionStorage.setItem("org-setup-complete--user-a--", "1");
    expect(hasCompletionMarker("user-a", "")).toBe(false);
  });
});

describe("clearCompletionMarker", () => {
  it("removes the scoped marker for the given user + org", () => {
    setCompletionMarker(USER_A, ORG_X);
    clearCompletionMarker(USER_A, ORG_X);
    expect(hasCompletionMarker(USER_A, ORG_X)).toBe(false);
  });

  it("does not disturb a marker for a different user + org", () => {
    setCompletionMarker(USER_A, ORG_X);
    setCompletionMarker(USER_B, ORG_Y);
    clearCompletionMarker(USER_A, ORG_X);
    expect(hasCompletionMarker(USER_B, ORG_Y)).toBe(true);
  });

  it("also removes the stale bare legacy key", () => {
    sessionStorage.setItem("org-setup-complete", "1");
    clearCompletionMarker(USER_A, ORG_X);
    expect(sessionStorage.getItem("org-setup-complete")).toBeNull();
  });
});

describe("stale bare/unscoped marker does not grant entry", () => {
  it("hasCompletionMarker ignores the bare legacy key", () => {
    sessionStorage.setItem("org-setup-complete", "1");
    expect(hasCompletionMarker(USER_A, ORG_X)).toBe(false);
  });

  it("hasCompletionMarker ignores a wrong-user scoped key", () => {
    sessionStorage.setItem(`org-setup-complete--${USER_B}--${ORG_X}`, "1");
    expect(hasCompletionMarker(USER_A, ORG_X)).toBe(false);
  });
});

const BASE_DRAFT = {
  goals: [],
  industry: "",
  companyName: "",
  displayName: "",
  fullName: "",
  teamSize: "",
  phone: "",
  installedApps: [],
  modules: [],
  invitees: [],
  moduleAnswers: {},
};

describe("clearAll — clears draft and step, leaves completion marker", () => {
  it("removes the draft and step for the given scopeId", () => {
    saveDraft({ ...BASE_DRAFT, goals: ["sales"], industry: "IT", companyName: "Acme", fullName: "Owner A", teamSize: "1-10" }, USER_A);
    saveStep(3, USER_A);
    clearAll(USER_A);
    const draft = loadDraft(USER_A);
    expect(draft.goals).toHaveLength(0);
    expect(loadStep(USER_A)).toBe(1);
  });

  it("does NOT touch the sessionStorage completion marker", () => {
    setCompletionMarker(USER_A, ORG_X);
    clearAll(USER_A);
    expect(hasCompletionMarker(USER_A, ORG_X)).toBe(true);
  });

  it("does not disturb a different user's draft", () => {
    saveDraft({ ...BASE_DRAFT, goals: ["hr"], industry: "IT", companyName: "Beta", fullName: "Owner B", teamSize: "1-10" }, USER_B);
    clearAll(USER_A);
    const draft = loadDraft(USER_B);
    expect(draft.companyName).toBe("Beta");
  });
});

const SERVER_DRAFT_DATA = {
  ...BASE_DRAFT,
  displayName: "Acme Workspace",
  invitees: [{ email: "bob@acme.com", role: "MEMBER" }],
};

const LOCAL_DRAFT_DATA = {
  ...BASE_DRAFT,
  displayName: "Local Workspace",
};

describe("mergeServerDraft — revision-based merge", () => {
  it("server revision newer: server data wins", () => {
    const result = mergeServerDraft(LOCAL_DRAFT_DATA, 1, {
      revision: 3,
      data: SERVER_DRAFT_DATA,
    });
    expect(result.displayName).toBe("Acme Workspace");
  });

  it("server revision equal to local: server data wins (server is canonical)", () => {
    const result = mergeServerDraft(LOCAL_DRAFT_DATA, 3, {
      revision: 3,
      data: SERVER_DRAFT_DATA,
    });
    expect(result.displayName).toBe("Acme Workspace");
  });

  it("local revision newer: local data wins", () => {
    const result = mergeServerDraft(LOCAL_DRAFT_DATA, 5, {
      revision: 3,
      data: SERVER_DRAFT_DATA,
    });
    expect(result.displayName).toBe("Local Workspace");
  });

  it("invitation rows survive cross-device load when server revision wins", () => {
    const result = mergeServerDraft(LOCAL_DRAFT_DATA, 1, {
      revision: 2,
      data: SERVER_DRAFT_DATA,
    });
    expect(result.invitees).toHaveLength(1);
    expect(result.invitees[0]?.email).toBe("bob@acme.com");
  });
});

const mockPut = jest.fn();

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    put: (...args: unknown[]) => mockPut(...args),
    get: jest.fn(),
  },
}));

jest.mock("@/hooks/api/org-setup-schema", () => ({
  ...jest.requireActual("@/hooks/api/org-setup-schema"),
  orgSetupDraftSaveContract: {},
  orgSetupDraftContract: {},
}));

describe("syncDraftToServer — syncStatus transitions", () => {
  beforeEach(() => {
    mockPut.mockReset();
  });

  it("transitions saving → synced on network success", async () => {
    mockPut.mockResolvedValue({ success: true });
    const statuses: SyncStatus[] = [];
    await syncDraftToServer(1, LOCAL_DRAFT_DATA, (s) => statuses.push(s));
    expect(statuses).toEqual(["saving", "synced"]);
  });

  it("transitions saving → error on network failure", async () => {
    mockPut.mockRejectedValue(new Error("Network error"));
    const statuses: SyncStatus[] = [];
    await syncDraftToServer(1, LOCAL_DRAFT_DATA, (s) => statuses.push(s));
    expect(statuses).toEqual(["saving", "error"]);
  });
});


describe("getCompletionDestination", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("returns the stored destination path", () => {
    setCompletionMarker(USER_A, ORG_X, "/build");
    expect(getCompletionDestination(USER_A, ORG_X)).toBe("/build");
  });

  it("maps legacy marker value 1 to /dashboard", () => {
    sessionStorage.setItem(`org-setup-complete--${USER_A}--${ORG_X}`, "1");
    expect(hasCompletionMarker(USER_A, ORG_X)).toBe(true);
    expect(getCompletionDestination(USER_A, ORG_X)).toBe("/dashboard");
  });
});
