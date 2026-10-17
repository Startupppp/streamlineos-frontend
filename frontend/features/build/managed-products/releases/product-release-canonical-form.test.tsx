import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ManagedProductRelease } from "@/hooks/api/build/managed-product-releases";
import { ProductReleaseFormSheet } from "./product-release-form-sheet";
import { buildRelease } from "./product-releases-test-fixtures";

const mockCreateMutate = jest.fn();
const mockUpdateMutate = jest.fn();
const mockUseSelectorProjects = jest.fn();
const mockUseSelectorProjectReleases = jest.fn();
const mockProjectsRefetch = jest.fn();
const mockReleasesRefetch = jest.fn();
const mockProjectsFetchNextPage = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
  usePathname: () => "/build/managed-products/7/releases",
  useSearchParams: () => new URLSearchParams(""),
}));

jest.mock("@/hooks/api/build/managed-product-releases", () => ({
  useCreateManagedProductRelease: () => ({
    mutate: mockCreateMutate,
    isPending: false,
  }),
  useUpdateManagedProductRelease: () => ({
    mutate: mockUpdateMutate,
    isPending: false,
    variables: undefined,
  }),
}));

jest.mock("../use-infinite-selector", () => ({
  useInfiniteSelectorProjects: (...args: unknown[]) => mockUseSelectorProjects(...args),
  useInfiniteSelectorProjectReleases: (...args: unknown[]) =>
    mockUseSelectorProjectReleases(...args),
}));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

jest.mock("@/components/shared/dirty-state-context", () => ({
  useRegisterDirtyState: () => {},
}));

jest.mock("@/components/members/member-picker", () => ({
  MemberPicker: () => null,
}));

jest.mock("@/components/ui/date-picker", () => ({
  DatePicker: () => null,
}));

const LINKED_PROJECTS = [
  { id: 10, name: "Billing Project", key: "BILL", status: "active", isPrimary: false },
];

const RELEASES_FOR_PROJECT_10 = [
  { id: 99, name: "v2.0 Sprint", version: "2.0.0", status: "released", releaseDate: "2026-09-01" },
  { id: 100, name: "v2.1 Fix", version: "2.1.0", status: "draft", releaseDate: null },
];

function infinitePage(rows: unknown[], overrides: Record<string, unknown> = {}) {
  return {
    data: { pages: [{ data: rows, pagination: { limit: 25, hasMore: false, nextCursor: null } }] },
    isLoading: false,
    isFetching: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: jest.fn(),
    ...overrides,
  };
}

function setupDefaults() {
  mockUseSelectorProjects.mockReturnValue(
    infinitePage(LINKED_PROJECTS, {
      refetch: mockProjectsRefetch,
      fetchNextPage: mockProjectsFetchNextPage,
    }),
  );
  mockUseSelectorProjectReleases.mockImplementation((projectId: number | null) =>
    projectId === 10
      ? infinitePage(RELEASES_FOR_PROJECT_10, { refetch: mockReleasesRefetch })
      : infinitePage([], { refetch: mockReleasesRefetch }),
  );
}

function renderCreateSheet() {
  return render(
    <ProductReleaseFormSheet
      managedProductId={7}
      open
      onOpenChange={jest.fn()}
    />,
  );
}

function renderEditSheet(editTarget: ManagedProductRelease) {
  return render(
    <ProductReleaseFormSheet
      managedProductId={7}
      editTarget={editTarget}
      open
      onOpenChange={jest.fn()}
    />,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  Object.defineProperty(Element.prototype, "hasPointerCapture", { value: jest.fn(() => false), writable: true, configurable: true });
  Object.defineProperty(Element.prototype, "setPointerCapture", { value: jest.fn(), writable: true, configurable: true });
  Object.defineProperty(Element.prototype, "releasePointerCapture", { value: jest.fn(), writable: true, configurable: true });
  setupDefaults();
});

describe("ProductReleaseFormSheet — canonical project release", () => {
  it("submits the chosen projectReleaseId, so the product release records which canonical delivery release ships it", async () => {
    const user = userEvent.setup({ delay: null });
    renderCreateSheet();

    await user.type(screen.getByPlaceholderText("Release name"), "My Release");
    await user.type(screen.getByPlaceholderText("1.0.0"), "1.0.0");

    const projectTrigger = screen.getByRole("combobox", { name: "Project for canonical release" });
    await user.click(projectTrigger);
    await user.click(await screen.findByRole("option", { name: "BILL · Billing Project" }));

    const releaseTrigger = screen.getByRole("combobox", { name: "Canonical release" });
    await user.click(releaseTrigger);
    await user.click(await screen.findByRole("option", { name: "v2.0 Sprint 2.0.0" }));

    await user.click(screen.getByRole("button", { name: "Create release" }));

    expect(mockCreateMutate).toHaveBeenCalledWith(
      expect.objectContaining({ projectReleaseId: 99 }),
      expect.anything(),
    );
  });

  it("submits null to clear the link, so a wrong canonical release can be detached rather than only replaced", async () => {
    const user = userEvent.setup({ delay: null });
    const editTarget: ManagedProductRelease = {
      ...buildRelease({ id: 1, projectReleaseId: 99, recordRevision: 2 }),
      projectRelease: {
        id: 99,
        name: "v2.0 Sprint",
        version: "2.0.0",
        projectId: 10,
        projectName: "Billing Project",
        projectKey: "BILL",
      },
    };
    renderEditSheet(editTarget);

    const clearButton = screen.getByRole("button", { name: "Choose another project" });
    await user.click(clearButton);

    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(mockUpdateMutate).toHaveBeenCalledWith(
      expect.objectContaining({ projectReleaseId: null }),
      expect.anything(),
    );
  });

  it("offers releases only from projects linked to this product, because the backend 404s any other project release", async () => {
    const user = userEvent.setup({ delay: null });
    renderCreateSheet();

    const projectTrigger = screen.getByRole("combobox", { name: "Project for canonical release" });
    await user.click(projectTrigger);

    const projectOptions = await screen.findAllByRole("option");
    const projectLabels = projectOptions.map((o) => o.textContent);
    expect(projectLabels).toContain("BILL · Billing Project");
    expect(projectLabels).not.toContain("Unlinked External Project");

    await user.click(screen.getByRole("option", { name: "BILL · Billing Project" }));

    const releaseTrigger = screen.getByRole("combobox", { name: "Canonical release" });
    await user.click(releaseTrigger);

    const releaseOptions = await screen.findAllByRole("option");
    const releaseLabels = releaseOptions.map((o) => o.textContent);
    expect(releaseLabels).toContain("v2.0 Sprint 2.0.0");
    expect(releaseLabels).toContain("v2.1 Fix 2.1.0");

    expect(mockUseSelectorProjectReleases).toHaveBeenCalledWith(10, "", true);
  });

  it("editing a release that already has a canonical link shows the linked project and release by name", async () => {
    const editTarget: ManagedProductRelease = {
      ...buildRelease({ id: 1, projectReleaseId: 99, recordRevision: 1 }),
      projectRelease: {
        id: 99,
        name: "v2.0 Sprint",
        version: "2.0.0",
        projectId: 10,
        projectName: "Billing Project",
        projectKey: "BILL",
      },
    };
    renderEditSheet(editTarget);

    const releaseTrigger = screen.getByRole("combobox", { name: "Canonical release" });
    expect(releaseTrigger).toHaveTextContent("v2.0 Sprint 2.0.0");
    expect(
      screen.queryByRole("combobox", { name: "Project for canonical release" }),
    ).not.toBeInTheDocument();
  });

  it("shows a failed linked-project read as an error with a retry instead of an empty project list", async () => {
    const user = userEvent.setup({ delay: null });
    mockUseSelectorProjects.mockReturnValue(
      infinitePage([], {
        isError: true,
        error: new Error("projects read failed"),
        refetch: mockProjectsRefetch,
      }),
    );
    renderCreateSheet();

    expect(screen.getByText("Could not load linked projects")).toBeInTheDocument();
    expect(
      screen.queryByRole("combobox", { name: "Project for canonical release" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /retry|try again/i }));
    expect(mockProjectsRefetch).toHaveBeenCalledTimes(1);
  });

  it("keeps the project selected and offers a retry when only that project's releases fail to load", async () => {
    const user = userEvent.setup({ delay: null });
    mockUseSelectorProjectReleases.mockImplementation((projectId: number | null) =>
      projectId === null
        ? infinitePage([])
        : infinitePage([], {
            isError: true,
            error: new Error("releases read failed"),
            refetch: mockReleasesRefetch,
          }),
    );
    renderCreateSheet();

    await user.click(
      screen.getByRole("combobox", { name: "Project for canonical release" }),
    );
    await user.click(
      await screen.findByRole("option", { name: "BILL · Billing Project" }),
    );

    expect(screen.getByText("Could not load that project's releases")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Choose another project" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /retry|try again/i }));
    expect(mockReleasesRefetch).toHaveBeenCalledTimes(1);
  });

  it("omits empty optional values when creating because the create API accepts absent fields", async () => {
    const user = userEvent.setup({ delay: null });
    renderCreateSheet();

    await user.type(screen.getByPlaceholderText("Release name"), "Minimal release");
    await user.type(screen.getByPlaceholderText("1.0.0"), "1.0.0");
    await user.click(screen.getByRole("button", { name: "Create release" }));

    expect(mockCreateMutate).toHaveBeenCalledWith(
      {
        name: "Minimal release",
        version: "1.0.0",
        status: "draft",
      },
      expect.anything(),
    );
  });

  it("continues past the first page of linked projects, so a product with more projects than one page can still be linked", async () => {
    const user = userEvent.setup({ delay: null });
    mockUseSelectorProjects.mockReturnValue(
      infinitePage(LINKED_PROJECTS, {
        hasNextPage: true,
        refetch: mockProjectsRefetch,
        fetchNextPage: mockProjectsFetchNextPage,
      }),
    );
    renderCreateSheet();

    await user.click(
      screen.getByRole("combobox", { name: "Project for canonical release" }),
    );
    await user.click(await screen.findByRole("button", { name: "Load more projects" }));

    expect(mockProjectsFetchNextPage).toHaveBeenCalledTimes(1);
  });

  it("asks the server for matching projects rather than filtering one loaded page", async () => {
    const user = userEvent.setup({ delay: null });
    renderCreateSheet();

    await user.click(
      screen.getByRole("combobox", { name: "Project for canonical release" }),
    );
    await user.type(screen.getByPlaceholderText("Search linked projects…"), "bill");

    await waitFor(() => {
      expect(mockUseSelectorProjects).toHaveBeenCalledWith(7, "bill", true);
    });
  });
});
