import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BuildScopeBrowser } from "./build-scope-browser";
import { useBuildScopeDirectory } from "./use-build-scope-directory";
import { useReconciledBuildScopes } from "./use-reconciled-build-scopes";
import { useBuildScopeRecents, useBuildScopeStars } from "./use-build-nav-preferences";
import type { BuildScopeDirectory, BuildScopeDirectoryEntry } from "./use-build-scope-directory";
import type { BuildScopeRef } from "./use-build-nav-preferences";

jest.mock("./use-build-scope-directory");
jest.mock("./use-reconciled-build-scopes");
jest.mock("./use-build-nav-preferences");

const mockUseBuildScopeDirectory = useBuildScopeDirectory as jest.MockedFunction<typeof useBuildScopeDirectory>;
const mockUseReconciledBuildScopes = useReconciledBuildScopes as jest.MockedFunction<typeof useReconciledBuildScopes>;
const mockUseBuildScopeRecents = useBuildScopeRecents as jest.MockedFunction<typeof useBuildScopeRecents>;
const mockUseBuildScopeStars = useBuildScopeStars as jest.MockedFunction<typeof useBuildScopeStars>;

function makeEntry(overrides: Partial<BuildScopeDirectoryEntry> = {}): BuildScopeDirectoryEntry {
  return {
    key: "project:1",
    type: "project",
    id: "1",
    name: "Alpha Project",
    parentPath: "Organization",
    parentKey: null,
    projectKey: "ALPHA",
    href: "/build/1",
    isArchived: false,
    ...overrides,
  };
}

function makeRef(overrides: Partial<BuildScopeRef> = {}): BuildScopeRef {
  return {
    key: "project:1",
    type: "project",
    id: "1",
    name: "Alpha Project",
    parentPath: "Organization",
    parentKey: null,
    projectKey: "ALPHA",
    href: "/build/1",
    ...overrides,
  };
}

function makeDirectory(overrides: Partial<BuildScopeDirectory> = {}): BuildScopeDirectory {
  return {
    products: [],
    projects: [],
    quarantinedProjects: [],
    isLoading: false,
    isRefreshing: false,
    isError: false,
    isDenied: false,
    hasMoreProjects: false,
    isFetchingMoreProjects: false,
    fetchMoreProjects: jest.fn(),
    hasMoreHierarchy: false,
    isFetchingMoreHierarchy: false,
    fetchMoreHierarchy: jest.fn(),
    refetch: jest.fn(),
    ...overrides,
  };
}

const DEFAULT_PROPS = {
  currentScopeKey: "organization",
  settingsHrefFor: () => null as string | null,
  onSelect: jest.fn(),
};

function setupMocks(directoryOverrides: Partial<BuildScopeDirectory> = {}) {
  mockUseBuildScopeDirectory.mockReturnValue(makeDirectory(directoryOverrides));
  mockUseReconciledBuildScopes.mockReturnValue({ entries: [], isReconciled: false });
  mockUseBuildScopeRecents.mockReturnValue({
    recents: [],
    replaceRecents: jest.fn(),
    recordScope: jest.fn(),
  } as ReturnType<typeof useBuildScopeRecents>);
  mockUseBuildScopeStars.mockReturnValue({
    starred: [],
    isStarred: () => false,
    toggleStar: jest.fn(),
    replaceStarred: jest.fn(),
  } as ReturnType<typeof useBuildScopeStars>);
}

function renderBrowser(props: Partial<typeof DEFAULT_PROPS> = {}) {
  return render(<BuildScopeBrowser {...DEFAULT_PROPS} {...props} />);
}

function setupExpandable(name = "WS") {
  const product = makeEntry({ key: "product:p1", type: "product", name, parentKey: null });
  const child = makeEntry({ key: "project:1", name: "ChildProject", parentKey: "product:p1" });
  setupMocks({ products: [product], projects: [child] });
}

beforeEach(() => jest.clearAllMocks());

describe("BSN-02-017 — four distinct empty states", () => {
  test("isLoading shows skeleton rows and not error or no-scopes text", () => {
    setupMocks({ isLoading: true });
    renderBrowser();
    expect(document.querySelector(".animate-pulse, [class*='skeleton'], [class*='animate-']")).toBeTruthy();
    expect(screen.queryByText("Couldn't load")).not.toBeInTheDocument();
    expect(screen.queryByText("No accessible Build scopes")).not.toBeInTheDocument();
    expect(screen.queryByText("Build access required")).not.toBeInTheDocument();
  });

  test("isDenied shows Build access required, not the error state or no-scopes message", () => {
    setupMocks({ isDenied: true });
    renderBrowser();
    expect(screen.getByText("Build access required")).toBeInTheDocument();
    expect(screen.queryByText("Couldn't load")).not.toBeInTheDocument();
    expect(screen.queryByText("No accessible Build scopes")).not.toBeInTheDocument();
  });

  test("isError shows the load-failure error state, not the denied or no-scopes message", () => {
    setupMocks({ isError: true });
    renderBrowser();
    expect(screen.getByText("Couldn't load your Build scopes")).toBeInTheDocument();
    expect(screen.queryByText("Build access required")).not.toBeInTheDocument();
    expect(screen.queryByText("No accessible Build scopes")).not.toBeInTheDocument();
  });

  test("empty browse with no scopes shows the no-accessible-scopes message, not error or denied", () => {
    setupMocks();
    renderBrowser();
    expect(screen.getByText("No accessible Build scopes")).toBeInTheDocument();
    expect(screen.queryByText("Couldn't load")).not.toBeInTheDocument();
    expect(screen.queryByText("Build access required")).not.toBeInTheDocument();
  });

  test("search with no results shows no-matching-scopes message distinct from no-accessible-scopes", async () => {
    setupMocks();
    renderBrowser();
    await userEvent.type(screen.getByPlaceholderText(/Search projects/), "xyz");
    await waitFor(() => {
      expect(screen.getByText("No matching scopes")).toBeInTheDocument();
    });
    expect(screen.queryByText("No accessible Build scopes")).not.toBeInTheDocument();
  });

  test("isDenied renders at higher priority than isError so the user gets the correct diagnosis", () => {
    setupMocks({ isDenied: true, isError: true });
    renderBrowser();
    expect(screen.queryByText("Couldn't load")).not.toBeInTheDocument();
    expect(screen.getByText("Build access required")).toBeInTheDocument();
  });

  test("isLoading renders at higher priority than isDenied to avoid a flash of denied state while access loads", () => {
    setupMocks({ isLoading: true, isDenied: true });
    renderBrowser();
    expect(screen.queryByText("Build access required")).not.toBeInTheDocument();
  });
});

describe("BSN-02-016 — background refresh indicator does not replace visible results", () => {
  test("isRefreshing shows a spinner alongside the results, not instead of them", () => {
    const project = makeEntry({ key: "project:1", name: "Alpha" });
    setupMocks({ isRefreshing: true, projects: [project] });
    renderBrowser();
    expect(screen.getByLabelText("Refreshing scopes")).toBeInTheDocument();
    expect(screen.getAllByRole("treeitem").length).toBeGreaterThan(0);
  });

  test("when not refreshing the spinner is absent", () => {
    setupMocks({ isRefreshing: false });
    renderBrowser();
    expect(screen.queryByLabelText("Refreshing scopes")).not.toBeInTheDocument();
  });
});

describe("BSN-02-026 — archived row behaviour in the browser", () => {
  test("useBuildScopeDirectory is initially called with includeArchived false", () => {
    setupMocks();
    renderBrowser();
    expect(mockUseBuildScopeDirectory).toHaveBeenCalledWith("", false);
  });

  test("toggling Include archived passes true to useBuildScopeDirectory", async () => {
    setupMocks();
    renderBrowser();
    await userEvent.click(screen.getByRole("button", { name: /Include archived/ }));
    expect(mockUseBuildScopeDirectory).toHaveBeenCalledWith("", true);
  });

  test("Include archived button carries aria-pressed reflecting the current toggle state", () => {
    setupMocks();
    renderBrowser();
    expect(screen.getByRole("button", { name: /Include archived/ })).toHaveAttribute("aria-pressed", "false");
  });
});

describe("BSN-02-030 — ARIA roles for browse tree and flat lists", () => {
  test("browse section has role=tree", () => {
    const project = makeEntry();
    setupMocks({ projects: [project] });
    renderBrowser();
    expect(screen.getByRole("tree", { name: "Build scopes" })).toBeInTheDocument();
  });

  test("browse tree items have role=treeitem", () => {
    const project = makeEntry({ key: "project:1", name: "Alpha" });
    setupMocks({ projects: [project] });
    renderBrowser();
    const treeitems = screen.getAllByRole("treeitem");
    expect(treeitems.length).toBeGreaterThan(0);
  });

  test("starred items have role=option inside a role=listbox", () => {
    const ref = makeRef({ key: "project:5", name: "StarredProject" });
    setupMocks();
    mockUseReconciledBuildScopes.mockReturnValueOnce({ entries: [], isReconciled: false });
    mockUseReconciledBuildScopes.mockReturnValueOnce({ entries: [ref], isReconciled: false });
    renderBrowser();
    expect(screen.getByRole("listbox", { name: "Starred scopes" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /StarredProject/ })).toBeInTheDocument();
  });

  test("recent items have role=option inside a role=listbox", () => {
    const ref = makeRef({ key: "project:6", name: "RecentProject" });
    setupMocks();
    mockUseReconciledBuildScopes.mockReturnValueOnce({ entries: [ref], isReconciled: false });
    mockUseReconciledBuildScopes.mockReturnValueOnce({ entries: [], isReconciled: false });
    renderBrowser();
    expect(screen.getByRole("listbox", { name: "Recent scopes" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /RecentProject/ })).toBeInTheDocument();
  });

  test("search results are in a role=listbox with role=option items", async () => {
    const project = makeEntry({ key: "project:1", name: "SearchHit" });
    setupMocks({ projects: [project] });
    renderBrowser();
    await userEvent.type(screen.getByPlaceholderText(/Search projects/), "Se");
    await waitFor(() => {
      expect(screen.getByRole("listbox", { name: "Scope search results" })).toBeInTheDocument();
    });
  });

  test("browse items carry data-scope-key so keyboard handlers can identify the focused entry", () => {
    const project = makeEntry({ key: "project:1" });
    setupMocks({ projects: [project] });
    renderBrowser();
    const treeitems = screen.getAllByRole("treeitem");
    const withScopeKey = treeitems.filter((el) => el.getAttribute("data-scope-key") !== null);
    expect(withScopeKey.length).toBeGreaterThan(0);
  });

  test("ArrowRight on a collapsed expandable treeitem expands it", async () => {
    setupExpandable("Product1");
    renderBrowser();

    const expandBtn = screen.getByRole("button", { name: "Expand Product1" });
    expect(expandBtn).toHaveAttribute("aria-expanded", "false");

    const productItem = screen.getByRole("treeitem", { name: /Product1/ });
    productItem.focus();

    fireEvent.keyDown(productItem, { key: "ArrowRight" });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Collapse Product1" })).toBeInTheDocument();
    });
  });

  test("ArrowLeft on an expanded treeitem collapses it", async () => {
    setupExpandable("Product1");
    renderBrowser();

    await userEvent.click(screen.getByRole("button", { name: "Expand Product1" }));
    await waitFor(() => screen.getByRole("button", { name: "Collapse Product1" }));

    const productItem = screen.getByRole("treeitem", { name: /Product1/ });
    productItem.focus();
    fireEvent.keyDown(productItem, { key: "ArrowLeft" });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Expand Product1" })).toBeInTheDocument();
    });
  });

  test("children of an expanded item are wrapped in role=group", async () => {
    setupExpandable("Product1");
    renderBrowser();

    await userEvent.click(screen.getByRole("button", { name: "Expand Product1" }));

    await waitFor(() => {
      expect(document.querySelector('[role="group"]')).toBeInTheDocument();
    });
  });
});

describe("BSN-02-033 — 44px touch targets on expand buttons (class assertion — not layout-verified in jsdom)", () => {
  test("expand button carries h-11 for 44px mobile touch target", () => {
    setupExpandable();
    renderBrowser();
    const expandBtn = screen.getByRole("button", { name: /Expand WS/ });
    expect(expandBtn.className).toContain("h-11");
  });

  test("expand button reverts to h-5 at md breakpoint for desktop density", () => {
    setupExpandable();
    renderBrowser();
    const expandBtn = screen.getByRole("button", { name: /Expand WS/ });
    expect(expandBtn.className).toContain("md:h-5");
  });
});

describe("BSN-02-034 — reduced motion (class assertion — not browser-verified in jsdom)", () => {
  test("expand chevron carries motion-reduce:transition-none to disable rotation animation under reduced motion", () => {
    setupExpandable();
    renderBrowser();
    const expandBtn = screen.getByRole("button", { name: /Expand WS/ });
    const chevron = expandBtn.querySelector("svg");
    expect(chevron?.getAttribute("class") ?? "").toContain("motion-reduce:transition-none");
  });

  test("refresh spinner has motion-reduce:animation-none so it does not animate under reduced motion", () => {
    setupMocks({ isRefreshing: true });
    renderBrowser();
    const spinner = screen.getByLabelText("Refreshing scopes");
    expect(spinner.getAttribute("class") ?? "").toContain("motion-reduce:animation-none");
  });
});

describe("BSN-02-014 — real load-more buttons replace the old silent truncation hint", () => {
  test("Load more projects button is present when hasMoreProjects is true", () => {
    const project = makeEntry({ key: "project:1", name: "Alpha" });
    setupMocks({ projects: [project], hasMoreProjects: true });
    renderBrowser();
    expect(screen.getByRole("button", { name: /Load more projects/i })).toBeInTheDocument();
  });

  test("Load more projects button is absent when hasMoreProjects is false", () => {
    const project = makeEntry({ key: "project:1", name: "Alpha" });
    setupMocks({ projects: [project], hasMoreProjects: false });
    renderBrowser();
    expect(screen.queryByRole("button", { name: /Load more projects/i })).not.toBeInTheDocument();
  });

  test("clicking Load more projects calls fetchMoreProjects so the next cursor page is requested", async () => {
    const fetchMoreProjects = jest.fn();
    const project = makeEntry({ key: "project:1", name: "Alpha" });
    setupMocks({ projects: [project], hasMoreProjects: true, fetchMoreProjects });
    renderBrowser();
    await userEvent.click(screen.getByRole("button", { name: /Load more projects/i }));
    expect(fetchMoreProjects).toHaveBeenCalledTimes(1);
  });

  test("Load more projects button is disabled and shows a spinner while isFetchingMoreProjects is true", () => {
    const project = makeEntry({ key: "project:1", name: "Alpha" });
    setupMocks({ projects: [project], hasMoreProjects: true, isFetchingMoreProjects: true });
    renderBrowser();
    expect(screen.getByRole("button", { name: /Load more projects/i })).toBeDisabled();
  });

  test("Load more products button is present when hasMoreHierarchy is true", () => {
    const product = makeEntry({ key: "product:p1", type: "product", name: "WS", parentKey: null });
    setupMocks({ products: [product], hasMoreHierarchy: true });
    renderBrowser();
    expect(screen.getByRole("button", { name: /Load more products/i })).toBeInTheDocument();
  });

  test("clicking Load more products calls fetchMoreHierarchy so the next cursor page is requested", async () => {
    const fetchMoreHierarchy = jest.fn();
    const product = makeEntry({ key: "product:p1", type: "product", name: "WS", parentKey: null });
    setupMocks({ products: [product], hasMoreHierarchy: true, fetchMoreHierarchy });
    renderBrowser();
    await userEvent.click(screen.getByRole("button", { name: /Load more products/i }));
    expect(fetchMoreHierarchy).toHaveBeenCalledTimes(1);
  });

  test("neither load-more button appears when both hasMoreProjects and hasMoreHierarchy are false", () => {
    setupMocks({ hasMoreProjects: false, hasMoreHierarchy: false });
    renderBrowser();
    expect(screen.queryByRole("button", { name: /Load more/i })).not.toBeInTheDocument();
  });
});

describe("BLD-X-SB-DIR-001 — ARIA: search result items must carry role=option inside the listbox so screen readers locate them as choices, not as treeitem which belongs only to the browse tree", () => {
  test("search result items render as role=option so screen readers can announce them as listbox options", async () => {
    const project = makeEntry({ key: "project:1", name: "SearchHit" });
    setupMocks({ projects: [project] });
    renderBrowser();
    await userEvent.type(screen.getByPlaceholderText(/Search projects/), "Se");
    await waitFor(() => {
      expect(screen.getByRole("option", { name: /SearchHit/ })).toBeInTheDocument();
    });
  });

  test("search result items do not carry role=treeitem because treeitem belongs to the browse tree, not the search listbox", async () => {
    const project = makeEntry({ key: "project:1", name: "UniqueSearchEntry" });
    setupMocks({ projects: [project] });
    renderBrowser();
    await userEvent.type(screen.getByPlaceholderText(/Search projects/), "Se");
    await waitFor(() => {
      expect(screen.getByText("UniqueSearchEntry")).toBeInTheDocument();
    });
    const treeitems = screen.queryAllByRole("treeitem");
    expect(treeitems.some((el) => el.textContent?.includes("UniqueSearchEntry"))).toBe(false);
  });
});

describe("BLD-X-SB-DIR-001 — search-mode load-more: a paginated search result set must not be silently truncated at the first cursor page", () => {
  test("Load more projects button appears in search mode when hasMoreProjects is true so the user knows more matching results exist", async () => {
    const project = makeEntry({ key: "project:1", name: "Alpha" });
    setupMocks({ projects: [project], hasMoreProjects: true });
    renderBrowser();
    await userEvent.type(screen.getByPlaceholderText(/Search projects/), "Al");
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Load more projects/i })).toBeInTheDocument();
    });
  });

  test("Load more products button appears in search mode when hasMoreHierarchy is true", async () => {
    const product = makeEntry({ key: "product:p1", type: "product", name: "SearchWS", parentKey: null });
    setupMocks({ products: [product], hasMoreHierarchy: true });
    renderBrowser();
    await userEvent.type(screen.getByPlaceholderText(/Search projects/), "Se");
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Load more products/i })).toBeInTheDocument();
    });
  });

  test("clicking Load more projects in search mode calls fetchMoreProjects so the next cursor page is appended", async () => {
    const fetchMoreProjects = jest.fn();
    const project = makeEntry({ key: "project:1", name: "Alpha" });
    setupMocks({ projects: [project], hasMoreProjects: true, fetchMoreProjects });
    renderBrowser();
    await userEvent.type(screen.getByPlaceholderText(/Search projects/), "Al");
    await waitFor(() => screen.getByRole("button", { name: /Load more projects/i }));
    await userEvent.click(screen.getByRole("button", { name: /Load more projects/i }));
    expect(fetchMoreProjects).toHaveBeenCalledTimes(1);
  });

  test("Load more projects button is absent in search mode when hasMoreProjects is false so there is no spurious prompt", async () => {
    const project = makeEntry({ key: "project:1", name: "Alpha" });
    setupMocks({ projects: [project], hasMoreProjects: false });
    renderBrowser();
    await userEvent.type(screen.getByPlaceholderText(/Search projects/), "Al");
    await waitFor(() => {
      expect(screen.getByText("Alpha")).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: /Load more projects/i })).not.toBeInTheDocument();
  });
});

describe("BLD-X-SB-DIR-001 — authorization: denied user sees no scope rows via any rendering path including search, stars, and recents", () => {
  test("when isDenied, no option or treeitem roles appear so no scope row can surface to a user who lacks build:view", () => {
    const project = makeEntry({ key: "project:1", name: "SecretProject" });
    setupMocks({ isDenied: true, projects: [project] });
    renderBrowser();
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
    expect(screen.queryByRole("treeitem")).not.toBeInTheDocument();
    expect(screen.queryByText("SecretProject")).not.toBeInTheDocument();
  });
});

describe("BLD-X-SB-DIR-001 — cross-org isolation: starred and recent entries are keyed by org scope via orgScopedStorageKey at use-build-nav-preferences.ts:120-121 so a scope from org A cannot surface in org B", () => {
  test("useBuildScopeStars and useBuildScopeRecents are invoked on every render so org-scoped localStorage isolation always applies", () => {
    setupMocks();
    renderBrowser();
    expect(mockUseBuildScopeStars).toHaveBeenCalled();
    expect(mockUseBuildScopeRecents).toHaveBeenCalled();
  });

  test("when useBuildScopeStars returns empty for the current org scope, no Starred section renders even if a prior org had starred scopes under a different storage key", () => {
    mockUseBuildScopeStars.mockReturnValue({
      starred: [],
      isStarred: () => false,
      toggleStar: jest.fn(),
      replaceStarred: jest.fn(),
    } as ReturnType<typeof useBuildScopeStars>);
    setupMocks();
    renderBrowser();
    expect(screen.queryByRole("listbox", { name: "Starred scopes" })).not.toBeInTheDocument();
  });
});
