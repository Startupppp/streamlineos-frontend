import {
  setCompletionMarker,
  hasCompletionMarker,
  clearCompletionMarker,
  clearAll,
  saveDraft,
  loadDraft,
  saveStep,
  loadStep,
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

describe("clearAll — clears draft and step, leaves completion marker", () => {
  it("removes the draft and step for the given scopeId", () => {
    saveDraft({ goals: ["sales"], industry: "IT", companyName: "Acme", teamSize: "1-10", phone: "", installedApps: [], modules: [], invitees: [] }, USER_A);
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
    saveDraft({ goals: ["hr"], industry: "IT", companyName: "Beta", teamSize: "1-10", phone: "", installedApps: [], modules: [], invitees: [] }, USER_B);
    clearAll(USER_A);
    const draft = loadDraft(USER_B);
    expect(draft.companyName).toBe("Beta");
  });
});
