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
    workspaces: [],
    products: [],
    projects: [],
    quarantinedProducts: [],
    quarantinedProjects: [],
    isLoading: false,
    isRefreshing: false,
    isError: false,
    isDenied: false,
    hasMoreProjects: false,
    hasMoreHierarchy: false,
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
  mockUseReconciledBuildScopes.mockReturnValue({ entries: [] });
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

beforeEach(() => {
  jest.clearAllMocks();
});

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
    mockUseReconciledBuildScopes.mockReturnValueOnce({ entries: [] });
    mockUseReconciledBuildScopes.mockReturnValueOnce({ entries: [ref] });
    renderBrowser();
    expect(screen.getByRole("listbox", { name: "Starred scopes" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /StarredProject/ })).toBeInTheDocument();
  });

  test("recent items have role=option inside a role=listbox", () => {
    const ref = makeRef({ key: "project:6", name: "RecentProject" });
    setupMocks();
    mockUseReconciledBuildScopes.mockReturnValueOnce({ entries: [ref] });
    mockUseReconciledBuildScopes.mockReturnValueOnce({ entries: [] });
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
    const workspace = makeEntry({
      key: "workspace:ws1",
      type: "workspace",
      name: "Workspace1",
      parentKey: null,
    });
    const child = makeEntry({
      key: "project:1",
      name: "ChildProject",
      parentKey: "workspace:ws1",
    });
    setupMocks({ workspaces: [workspace], projects: [child] });
    renderBrowser();

    const expandBtn = screen.getByRole("button", { name: "Expand Workspace1" });
    expect(expandBtn).toHaveAttribute("aria-expanded", "false");

    const workspaceItem = screen.getByRole("treeitem", { name: /Workspace1/ });
    workspaceItem.focus();

    fireEvent.keyDown(workspaceItem, { key: "ArrowRight" });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Collapse Workspace1" })).toBeInTheDocument();
    });
  });

  test("ArrowLeft on an expanded treeitem collapses it", async () => {
    const workspace = makeEntry({
      key: "workspace:ws1",
      type: "workspace",
      name: "Workspace1",
      parentKey: null,
    });
    const child = makeEntry({
      key: "project:1",
      name: "ChildProject",
      parentKey: "workspace:ws1",
    });
    setupMocks({ workspaces: [workspace], projects: [child] });
    renderBrowser();

    await userEvent.click(screen.getByRole("button", { name: "Expand Workspace1" }));
    await waitFor(() => screen.getByRole("button", { name: "Collapse Workspace1" }));

    const workspaceItem = screen.getByRole("treeitem", { name: /Workspace1/ });
    workspaceItem.focus();
    fireEvent.keyDown(workspaceItem, { key: "ArrowLeft" });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Expand Workspace1" })).toBeInTheDocument();
    });
  });

  test("children of an expanded item are wrapped in role=group", async () => {
    const workspace = makeEntry({
      key: "workspace:ws1",
      type: "workspace",
      name: "Workspace1",
      parentKey: null,
    });
    const child = makeEntry({
      key: "project:1",
      name: "ChildProject",
      parentKey: "workspace:ws1",
    });
    setupMocks({ workspaces: [workspace], projects: [child] });
    renderBrowser();

    await userEvent.click(screen.getByRole("button", { name: "Expand Workspace1" }));

    await waitFor(() => {
      expect(document.querySelector('[role="group"]')).toBeInTheDocument();
    });
  });
});

describe("BSN-02-033 — 44px touch targets on expand buttons (class assertion — not layout-verified in jsdom)", () => {
  test("expand button carries h-11 for 44px mobile touch target", () => {
    const workspace = makeEntry({ key: "workspace:ws1", type: "workspace", name: "WS", parentKey: null });
    const child = makeEntry({ key: "project:1", parentKey: "workspace:ws1" });
    setupMocks({ workspaces: [workspace], projects: [child] });
    renderBrowser();
    const expandBtn = screen.getByRole("button", { name: /Expand WS/ });
    expect(expandBtn.className).toContain("h-11");
  });

  test("expand button reverts to h-5 at md breakpoint for desktop density", () => {
    const workspace = makeEntry({ key: "workspace:ws1", type: "workspace", name: "WS", parentKey: null });
    const child = makeEntry({ key: "project:1", parentKey: "workspace:ws1" });
    setupMocks({ workspaces: [workspace], projects: [child] });
    renderBrowser();
    const expandBtn = screen.getByRole("button", { name: /Expand WS/ });
    expect(expandBtn.className).toContain("md:h-5");
  });
});

describe("BSN-02-034 — reduced motion (class assertion — not browser-verified in jsdom)", () => {
  test("expand chevron carries motion-reduce:transition-none to disable rotation animation under reduced motion", () => {
    const workspace = makeEntry({ key: "workspace:ws1", type: "workspace", name: "WS", parentKey: null });
    const child = makeEntry({ key: "project:1", parentKey: "workspace:ws1" });
    setupMocks({ workspaces: [workspace], projects: [child] });
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
