import { renderHook, act } from "@testing-library/react";
import { type ReactNode } from "react";
import {
  OrgStorageScopeProvider,
  orgScopedStorageKey,
} from "@/lib/org-scoped-storage";
import { useInboxSavedViews } from "./use-inbox-saved-views";
import type { InboxFilterState } from "./inbox-view-params";

const STORAGE_NAME = "inbox-saved-views";

function makeState(view: InboxFilterState["view"] = "primary"): InboxFilterState {
  return {
    view,
    q: "",
    unreadOnly: false,
    category: "",
    priority: "",
    kindOverride: [],
    group: "none",
    from: "",
    to: "",
    module: "",
  };
}

function wrapWithScope(scope: string) {
  return function ScopeWrapper({ children }: { children: ReactNode }) {
    return <OrgStorageScopeProvider scope={scope}>{children}</OrgStorageScopeProvider>;
  };
}

beforeEach(() => {
  localStorage.clear();
});

describe("useInboxSavedViews — basic CRUD", () => {
  it("starts with no saved views", () => {
    const { result } = renderHook(() => useInboxSavedViews(), {
      wrapper: wrapWithScope("org-1"),
    });
    expect(result.current.views).toHaveLength(0);
  });

  it("saves a view and it appears in the list", () => {
    const { result } = renderHook(() => useInboxSavedViews(), {
      wrapper: wrapWithScope("org-1"),
    });
    act(() => result.current.saveView("My view", makeState("mail")));
    expect(result.current.views).toHaveLength(1);
    expect(result.current.views[0]?.name).toBe("My view");
  });

  it("deletes a saved view by id", () => {
    const { result } = renderHook(() => useInboxSavedViews(), {
      wrapper: wrapWithScope("org-1"),
    });
    act(() => result.current.saveView("To delete", makeState()));
    const id = result.current.views[0]?.id ?? "";
    act(() => result.current.deleteView(id));
    expect(result.current.views).toHaveLength(0);
  });

  it("deleting a nonexistent id leaves the list unchanged", () => {
    const { result } = renderHook(() => useInboxSavedViews(), {
      wrapper: wrapWithScope("org-1"),
    });
    act(() => result.current.saveView("Keep me", makeState()));
    act(() => result.current.deleteView("bogus-id"));
    expect(result.current.views).toHaveLength(1);
  });

  it("renames a saved view", () => {
    const { result } = renderHook(() => useInboxSavedViews(), {
      wrapper: wrapWithScope("org-1"),
    });
    act(() => result.current.saveView("Old name", makeState()));
    const id = result.current.views[0]?.id ?? "";
    act(() => result.current.renameView(id, "New name"));
    expect(result.current.views[0]?.name).toBe("New name");
  });

  it("preserves other views when renaming one", () => {
    const { result } = renderHook(() => useInboxSavedViews(), {
      wrapper: wrapWithScope("org-1"),
    });
    act(() => result.current.saveView("View A", makeState("primary")));
    act(() => result.current.saveView("View B", makeState("mail")));
    const idA = result.current.views[0]?.id ?? "";
    act(() => result.current.renameView(idA, "View A renamed"));
    expect(result.current.views[1]?.name).toBe("View B");
  });
});

describe("useInboxSavedViews — applyView recovers filter state", () => {
  it("applying a saved view restores the filter state", () => {
    const { result } = renderHook(() => useInboxSavedViews(), {
      wrapper: wrapWithScope("org-1"),
    });
    const original = makeState("mail");
    original.unreadOnly = true;
    act(() => result.current.saveView("Mail unread", original));
    const saved = result.current.views[0];
    if (!saved) throw new Error("no saved view");
    const restored = result.current.applyView(saved);
    expect(restored.view).toBe("mail");
    expect(restored.unreadOnly).toBe(true);
  });

  it("applying a view with a grouping restores the grouping", () => {
    const { result } = renderHook(() => useInboxSavedViews(), {
      wrapper: wrapWithScope("org-1"),
    });
    const state = makeState("notifications");
    state.group = "kind";
    act(() => result.current.saveView("Grouped", state));
    const saved = result.current.views[0];
    if (!saved) throw new Error("no saved view");
    const restored = result.current.applyView(saved);
    expect(restored.group).toBe("kind");
  });
});

describe("useInboxSavedViews — org-scoped storage", () => {
  it("views saved under org-1 are not visible to org-2", () => {
    const { result: r1 } = renderHook(() => useInboxSavedViews(), {
      wrapper: wrapWithScope("org-1"),
    });
    act(() => r1.current.saveView("Org1 view", makeState()));

    const { result: r2 } = renderHook(() => useInboxSavedViews(), {
      wrapper: wrapWithScope("org-2"),
    });
    expect(r2.current.views).toHaveLength(0);
  });

  it("views saved under org-2 do not appear in org-1", () => {
    const { result: r2 } = renderHook(() => useInboxSavedViews(), {
      wrapper: wrapWithScope("org-2"),
    });
    act(() => r2.current.saveView("Org2 view", makeState("mail")));

    const { result: r1 } = renderHook(() => useInboxSavedViews(), {
      wrapper: wrapWithScope("org-1"),
    });
    expect(r1.current.views).toHaveLength(0);
  });

  it("each org's storage key is distinct", () => {
    const key1 = orgScopedStorageKey("inbox-saved-views", "org-1");
    const key2 = orgScopedStorageKey("inbox-saved-views", "org-2");
    expect(key1).not.toBe(key2);
  });

  it("re-mounts in the same org still sees previously saved views from localStorage", () => {
    const { result: r1 } = renderHook(() => useInboxSavedViews(), {
      wrapper: wrapWithScope("org-1"),
    });
    act(() => r1.current.saveView("Persistent", makeState()));

    const { result: r2 } = renderHook(() => useInboxSavedViews(), {
      wrapper: wrapWithScope("org-1"),
    });
    expect(r2.current.views).toHaveLength(1);
    expect(r2.current.views[0]?.name).toBe("Persistent");
  });
});

describe("useInboxSavedViews — corrupt stored state degrades safely", () => {
  it("returns an empty list when localStorage contains invalid JSON", () => {
    const key = orgScopedStorageKey(STORAGE_NAME, "org-corrupt");
    localStorage.setItem(key, "{{not valid json}}");

    const { result } = renderHook(() => useInboxSavedViews(), {
      wrapper: wrapWithScope("org-corrupt"),
    });
    expect(result.current.views).toHaveLength(0);
  });

  it("returns an empty list when localStorage contains a non-array", () => {
    const key = orgScopedStorageKey(STORAGE_NAME, "org-bad-shape");
    localStorage.setItem(key, JSON.stringify({ id: "x", name: "x" }));

    const { result } = renderHook(() => useInboxSavedViews(), {
      wrapper: wrapWithScope("org-bad-shape"),
    });
    expect(result.current.views).toHaveLength(0);
  });

  it("filters out array entries that are not valid SavedInboxView objects", () => {
    const key = orgScopedStorageKey(STORAGE_NAME, "org-partial");
    localStorage.setItem(
      key,
      JSON.stringify([
        { id: "v1", name: "Good", params: "view=primary" },
        { id: 99, name: "Bad — id is a number" },
        null,
        "string-entry",
      ]),
    );

    const { result } = renderHook(() => useInboxSavedViews(), {
      wrapper: wrapWithScope("org-partial"),
    });
    expect(result.current.views).toHaveLength(1);
    expect(result.current.views[0]?.name).toBe("Good");
  });
});

describe("useInboxSavedViews — URL search params are the persistence format", () => {
  it("saved view params survive a round-trip through URLSearchParams", () => {
    const { result } = renderHook(() => useInboxSavedViews(), {
      wrapper: wrapWithScope("org-1"),
    });
    const state: InboxFilterState = {
      view: "notifications",
      q: "budget",
      unreadOnly: true,
      category: "MENTIONS",
      priority: "HIGH",
      kindOverride: ["notification"],
      group: "kind",
      from: "",
      to: "",
      module: "",
    };
    act(() => result.current.saveView("Full state", state));
    const saved = result.current.views[0];
    if (!saved) throw new Error("no saved view");
    const restored = result.current.applyView(saved);
    expect(restored.view).toBe("notifications");
    expect(restored.q).toBe("budget");
    expect(restored.unreadOnly).toBe(true);
    expect(restored.category).toBe("MENTIONS");
    expect(restored.priority).toBe("HIGH");
    expect(restored.kindOverride).toEqual(["notification"]);
    expect(restored.group).toBe("kind");
  });
});
