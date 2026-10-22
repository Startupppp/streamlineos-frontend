import {
  clearAll,
  clearCompletionMarker,
  getCompletionDestination,
  hasCompletionMarker,
  loadDraft,
  saveDraft,
  setCompletionMarker,
} from "./draft";
import { DEFAULT_DATA } from "./constants";

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe("organization setup draft storage", () => {
  it("keeps each user's draft separate", () => {
    saveDraft({ ...DEFAULT_DATA, displayName: "Acme" }, "user-a");
    saveDraft({ ...DEFAULT_DATA, displayName: "Beta" }, "user-b");

    expect(loadDraft("user-a").displayName).toBe("Acme");
    expect(loadDraft("user-b").displayName).toBe("Beta");
  });

  it("clears the finished user's draft without clearing another user's draft", () => {
    saveDraft({ ...DEFAULT_DATA, displayName: "Acme" }, "user-a");
    saveDraft({ ...DEFAULT_DATA, displayName: "Beta" }, "user-b");
    clearAll("user-a");

    expect(loadDraft("user-a").displayName).toBe("");
    expect(loadDraft("user-b").displayName).toBe("Beta");
  });
});

describe("organization setup completion marker", () => {
  it("is scoped to the user and organization", () => {
    setCompletionMarker("user-a", "org-a", "/build");

    expect(hasCompletionMarker("user-a", "org-a")).toBe(true);
    expect(hasCompletionMarker("user-b", "org-a")).toBe(false);
    expect(hasCompletionMarker("user-a", "org-b")).toBe(false);
    expect(getCompletionDestination("user-a", "org-a")).toBe("/build");
  });

  it("ignores unsafe redirect paths and clears the marker", () => {
    setCompletionMarker("user-a", "org-a", "//elsewhere.example");
    expect(getCompletionDestination("user-a", "org-a")).toBe("/dashboard");

    clearCompletionMarker("user-a", "org-a");
    expect(hasCompletionMarker("user-a", "org-a")).toBe(false);
  });

  it("preserves completion when local draft data is cleared", () => {
    setCompletionMarker("user-a", "org-a");
    clearAll("user-a");
    expect(hasCompletionMarker("user-a", "org-a")).toBe(true);
  });
});
