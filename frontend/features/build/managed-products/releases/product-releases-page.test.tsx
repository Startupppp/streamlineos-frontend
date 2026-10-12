import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import type { ManagedProductRelease } from "@/hooks/api/build/managed-product-releases";
import { getTodayString } from "@/lib/date-utils";
import { ProductReleasesPage } from "./product-releases-page";
import { buildRelease as release } from "./product-releases-test-fixtures";

const mockReplace = jest.fn();
let mockSearch = "";
const mockUseCan = jest.fn();
const mockUsePageState = jest.fn();
const mockUseInfiniteReleases = jest.fn();
const mockUseUpdateRelease = jest.fn();
const mockUseCreateRelease = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn() }),
  usePathname: () => "/build/managed-products/7/releases",
  useSearchParams: () => new URLSearchParams(mockSearch),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: (key: string) => mockUseCan(key),
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: (options: unknown) => mockUsePageState(options),
}));

jest.mock("@/components/shared/page-state", () => ({
  PageState: ({
    resolution,
    empty,
    children,
  }: {
    resolution: { kind: string };
    empty?: ReactNode;
    children: ReactNode;
  }) => {
    if (resolution.kind === "loading") return <div data-testid="page-loading" />;
    if (resolution.kind === "denied") return <div data-testid="no-permission" />;
    if (resolution.kind === "empty") return <div data-testid="page-empty">{empty}</div>;
    return <div data-testid="page-ready">{children}</div>;
  },
}));

jest.mock("@/hooks/api/build/managed-product-releases", () => ({
  useInfiniteManagedProductReleases: (...args: unknown[]) => mockUseInfiniteReleases(...args),
  useUpdateManagedProductRelease: (...args: unknown[]) => mockUseUpdateRelease(...args),
  useCreateManagedProductRelease: (...args: unknown[]) => mockUseCreateRelease(...args),
}));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const ROWS: ManagedProductRelease[] = [
  release({ id: 1, name: "Spring launch", version: "2.0.0", status: "draft" }),
  release({
    id: 2,
    name: "Winter polish",
    version: "1.4.0",
    status: "released",
    releaseDate: "2026-02-01",
    description: "Faster search",
  }),
  release({ id: 3, name: "Legacy beta", version: "0.9.0", status: "archived" }),
];

const mockMutate = jest.fn();

function setReleases(rows: ManagedProductRelease[]) {
  mockUseInfiniteReleases.mockReturnValue({
    data: { pages: [{ data: rows, pagination: { limit: 100, hasMore: false, nextCursor: null } }], pageParams: [undefined] },
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: jest.fn(),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSearch = "";
  mockUseCan.mockReturnValue(true);
  mockUsePageState.mockReturnValue({ kind: "ready" });
  mockUseUpdateRelease.mockReturnValue({ mutate: mockMutate, isPending: false, variables: undefined });
  mockUseCreateRelease.mockReturnValue({ mutate: jest.fn(), isPending: false });
  setReleases(ROWS);
});

describe("ProductReleasesPage", () => {
  it("renders upcoming drafts and the shipped timeline with a count subtitle", () => {
    render(<ProductReleasesPage managedProductId={7} />);
    expect(screen.getByRole("heading", { level: 1, name: "Releases" })).toBeInTheDocument();
    expect(screen.getByText("1 draft · 1 released · 1 archived")).toBeInTheDocument();
    const upcoming = screen.getByRole("list", { name: "Upcoming releases" });
    expect(within(upcoming).getByText("Spring launch")).toBeInTheDocument();
    const shipped = screen.getByRole("list", { name: "Shipped releases" });
    expect(within(shipped).getByText("Winter polish")).toBeInTheDocument();
    expect(within(shipped).getByText("Faster search")).toBeInTheDocument();
    expect(screen.queryByText("Legacy beta")).not.toBeInTheDocument();
  });

  it("gates the page on the exact GET /releases permission", () => {
    render(<ProductReleasesPage managedProductId={7} />);
    expect(mockUsePageState).toHaveBeenCalledWith(
      expect.objectContaining({ permission: "build:managed-products:view", error: null }),
    );
  });

  it("shows archived releases when the view filter is archived", () => {
    mockSearch = "view=archived";
    render(<ProductReleasesPage managedProductId={7} />);
    const archived = screen.getByRole("list", { name: "Archived releases" });
    expect(within(archived).getByText("Legacy beta")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Upcoming releases" })).not.toBeInTheDocument();
  });

  it("renders the empty state with a New release call to action", () => {
    setReleases([]);
    mockUsePageState.mockReturnValue({ kind: "empty" });
    render(<ProductReleasesPage managedProductId={7} />);
    const empty = screen.getByTestId("page-empty");
    expect(within(empty).getByText("No releases yet")).toBeInTheDocument();
    expect(within(empty).getByRole("button", { name: "New release" })).toBeInTheDocument();
  });

  it("renders the denied state instead of release content", () => {
    mockUsePageState.mockReturnValue({ kind: "denied", permission: "build:managed-products:view" });
    render(<ProductReleasesPage managedProductId={7} />);
    expect(screen.getByTestId("no-permission")).toBeInTheDocument();
    expect(screen.queryByText("Spring launch")).not.toBeInTheDocument();
  });

  it("marks a draft as released, defaulting an empty release date to today", async () => {
    const user = userEvent.setup();
    render(<ProductReleasesPage managedProductId={7} />);
    await user.click(screen.getByRole("button", { name: "Mark released" }));
    expect(mockMutate).toHaveBeenCalledWith(
      { releaseId: 1, expectedRevision: 1, status: "released", releaseDate: getTodayString() },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    );
  });

  it("keeps an existing release date when marking a draft as released", async () => {
    const user = userEvent.setup();
    setReleases([release({ id: 9, name: "Dated", status: "draft", releaseDate: "2026-12-01", recordRevision: 3 })]);
    render(<ProductReleasesPage managedProductId={7} />);
    await user.click(screen.getByRole("button", { name: "Mark released" }));
    expect(mockMutate).toHaveBeenCalledWith(
      { releaseId: 9, expectedRevision: 3, status: "released", releaseDate: "2026-12-01" },
      expect.anything(),
    );
  });

  it("archives a release only after the confirm dialog", async () => {
    const user = userEvent.setup();
    render(<ProductReleasesPage managedProductId={7} />);
    await user.click(screen.getByRole("button", { name: "Actions for Winter polish" }));
    await user.click(await screen.findByRole("menuitem", { name: "Archive" }));
    expect(mockMutate).not.toHaveBeenCalled();
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Archive" }));
    expect(mockMutate).toHaveBeenCalledWith(
      { releaseId: 2, expectedRevision: 1, status: "archived" },
      expect.anything(),
    );
  });

  it("shows New release and row actions when the user can update", () => {
    render(<ProductReleasesPage managedProductId={7} />);
    expect(screen.getAllByRole("button", { name: "New release" }).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Mark released" })).toBeInTheDocument();
  });

  it("hides New release and row actions when the user cannot update", () => {
    mockUseCan.mockImplementation((key: string) => key !== "build:managed-products:update");
    setReleases(ROWS.map((r) => ({ ...r, allowedActions: ["view"] })));
    render(<ProductReleasesPage managedProductId={7} />);
    expect(screen.queryByRole("button", { name: "New release" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mark released" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Actions for Winter polish" })).not.toBeInTheDocument();
  });
});
