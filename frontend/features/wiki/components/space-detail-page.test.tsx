import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiError } from "@/lib/api-envelope";
import { KB_SPACES } from "@/lib/knowledge-routes";
import SpaceDetailPage from "./space-detail-page";

const mockKbNewMenu = jest.fn<React.ReactElement | null, [Record<string, unknown>]>(() => null);
jest.mock("./kb-new-menu", () => ({
  KbNewMenu: (props: Record<string, unknown>) => mockKbNewMenu(props),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => "/knowledge/wiki/spaces/1",
  useSearchParams: () => new URLSearchParams(),
}));

const mockCan = jest.fn<boolean, [string]>();
const mockCanState = jest.fn<string, [string]>();
const mockAccess = jest.fn();
jest.mock("@/hooks/api/access", () => ({
  useCan: (key: string) => mockCan(key),
  useCanState: (key: string) => mockCanState(key),
  useAccess: () => mockAccess(),
}));

const mockKbTimeAgo = jest.fn<string, [string | Date]>();
jest.mock("@/features/wiki/lib/kb-date-utils", () => ({
  kbTimeAgo: (date: string | Date) => mockKbTimeAgo(date),
  kbTimeUntil: jest.fn(),
  kbFormatDate: jest.fn(),
}));
jest.mock("@/hooks/api/entitlements", () => ({ useEntitlements: () => ({ data: undefined }) }));

const mockKbSpace = jest.fn();
const mockArchive = jest.fn();
const mockRestore = jest.fn();
jest.mock("@/hooks/api/kb/spaces", () => ({
  useKbSpace: (spaceId: number) => mockKbSpace(spaceId),
  useArchiveKbSpace: () => mockArchive(),
  useRestoreKbSpace: () => mockRestore(),
  useKbSpaceArchiveImpact: () => ({ data: undefined, isLoading: false, isError: false }),
}));

const mockCreatePage = jest.fn();
jest.mock("@/hooks/api/kb", () => ({
  useCreateKbPage: () => mockCreatePage(),
}));

const mockPageCollection = jest.fn();
jest.mock("./wiki-page-collection-table", () => ({
  WikiPageCollectionTable: (props: unknown) => {
    mockPageCollection(props);
    return <div data-testid="page-collection" />;
  },
}));

const mockPageTree = jest.fn();
jest.mock("./page-tree", () => ({
  __esModule: true,
  default: (props: { spaceId?: number; onCloseMobile?: () => void }) => {
    mockPageTree(props);
    return (
      <div data-testid="page-tree">
        {props.onCloseMobile && (
          <button type="button" onClick={props.onCloseMobile}>Select page</button>
        )}
      </div>
    );
  },
}));

const mockMembers = jest.fn();
jest.mock("./space-members-sheet", () => ({
  SpaceMembersSheet: (props: { open: boolean; spaceName: string }) => {
    mockMembers(props);
    return props.open ? <div data-testid="members-sheet">Members — {props.spaceName}</div> : null;
  },
}));

function spaceData(over: Record<string, unknown> = {}) {
  return {
    id: 5,
    name: "Engineering Hub",
    slug: "engineering-hub",
    description: "Where engineers live",
    audience: "internal",
    icon: "🔧",
    isPublicHelpCenter: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    archivedAt: null,
    pagesOverdueForReview: 0,
    pagesWithReviewPolicy: 0,
    ...over,
  };
}

function spaceQuery(over: Record<string, unknown> = {}) {
  return {
    data: spaceData(),
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
    ...over,
  };
}

function mutation(over: Record<string, unknown> = {}) {
  return { mutate: jest.fn(), isPending: false, ...over };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockAccess.mockReturnValue({ data: { isOrgOwner: true, scopes: {}, modules: {} }, isLoading: false });
  mockCan.mockReturnValue(false);
  mockCanState.mockReturnValue("denied");
  mockKbTimeAgo.mockReturnValue("1d ago");
  mockKbSpace.mockReturnValue(spaceQuery());
  mockArchive.mockReturnValue(mutation());
  mockRestore.mockReturnValue(mutation());
  mockCreatePage.mockReturnValue(mutation());
  mockPageCollection.mockImplementation(() => undefined);
  mockKbNewMenu.mockReturnValue(null);
});

describe("SpaceDetailPage", () => {
  it("renders the space name, description and audience badge when data is loaded", () => {
    render(<SpaceDetailPage spaceId={5} />);

    expect(screen.getAllByText("Engineering Hub").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Where engineers live").length).toBeGreaterThan(0);
    expect(screen.getByText("Internal")).toBeInTheDocument();
  });

  it("shows the loading skeleton while the request is in flight, not the content", () => {
    mockKbSpace.mockReturnValue(spaceQuery({ data: undefined, isLoading: true }));

    render(<SpaceDetailPage spaceId={5} />);

    expect(screen.queryByText("Engineering Hub")).not.toBeInTheDocument();
  });

  it("names the space from cache in the header while a refetch is loading (KB-B-017)", () => {
    mockKbSpace.mockReturnValue(spaceQuery({ isLoading: true }));

    render(<SpaceDetailPage spaceId={5} />);

    expect(screen.getAllByText("Engineering Hub").length).toBeGreaterThan(0);
    expect(mockKbNewMenu).not.toHaveBeenCalled();
  });

  it("renders the not-found recovery state for a 404 response, not a generic error", () => {
    mockKbSpace.mockReturnValue(
      spaceQuery({
        data: undefined,
        isError: true,
        error: new ApiError("Not Found", 404, "NOT_FOUND", {}, "/kb/spaces/5"),
      }),
    );

    render(<SpaceDetailPage spaceId={5} />);

    expect(screen.getByText("Team folder not found")).toBeInTheDocument();
    expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();
    expect(screen.queryByText("Team folder unavailable")).not.toBeInTheDocument();
  });

  it("keeps an unexpected empty success distinct from a missing space and offers refresh", async () => {
    const refetch = jest.fn();
    mockKbSpace.mockReturnValue(spaceQuery({ data: undefined, refetch }));

    render(<SpaceDetailPage spaceId={5} />);

    expect(screen.getByText("Team folder unavailable")).toBeInTheDocument();
    expect(screen.queryByText("Team folder not found")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Refresh" }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("shows a denied state for a 403 response instead of a missing space", () => {
    mockKbSpace.mockReturnValue(spaceQuery({
      data: undefined,
      isError: true,
      error: new ApiError("Forbidden", 403, "FORBIDDEN", {}, "/kb/spaces/5"),
    }));

    render(<SpaceDetailPage spaceId={5} />);

    expect(screen.getByText("Access Restricted")).toBeInTheDocument();
    expect(screen.queryByText("Space not found")).not.toBeInTheDocument();
  });

  it("hides cached space metadata and actions after access is revoked", () => {
    mockCan.mockReturnValue(true);
    mockKbSpace.mockReturnValue(spaceQuery({
      isError: true,
      error: new ApiError("Forbidden", 403, "FORBIDDEN", {}, "/kb/spaces/5"),
    }));

    render(<SpaceDetailPage spaceId={5} />);

    expect(screen.getByText("Access Restricted")).toBeInTheDocument();
    expect(screen.queryByText("Engineering Hub")).not.toBeInTheDocument();
    expect(screen.queryByText("Where engineers live")).not.toBeInTheDocument();
    expect(mockKbNewMenu).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: /Members/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Archive/i })).not.toBeInTheDocument();
  });

  it("closes an open archive action when the space read is denied", async () => {
    mockCan.mockImplementation((key) => key === "kb:spaces:manage");
    const view = render(<SpaceDetailPage spaceId={5} />);

    await userEvent.click(screen.getByRole("button", { name: /^Archive$/i }));
    expect(screen.getByText(/Archiving "Engineering Hub" will hide it/)).toBeInTheDocument();

    mockKbSpace.mockReturnValue(spaceQuery({
      isError: true,
      error: new ApiError("Forbidden", 403, "FORBIDDEN", {}, "/kb/spaces/5"),
    }));
    view.rerender(<SpaceDetailPage spaceId={5} />);

    expect(screen.getByText("Access Restricted")).toBeInTheDocument();
    expect(screen.queryByText(/Archiving "Engineering Hub" will hide it/)).not.toBeInTheDocument();
  });

  it("renders the error state for a 500 response, not the not-found state", async () => {
    const refetch = jest.fn();
    mockKbSpace.mockReturnValue(
      spaceQuery({
        data: undefined,
        isError: true,
        error: new ApiError("Server Error", 500, "INTERNAL", {}, "/kb/spaces/5"),
        refetch,
      }),
    );

    render(<SpaceDetailPage spaceId={5} />);

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.queryByText("Space not found")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("passes the spaceId to the page collection table", () => {
    render(<SpaceDetailPage spaceId={5} />);

    expect(mockPageCollection).toHaveBeenCalledWith(
      expect.objectContaining({ fixedParams: expect.objectContaining({ spaceId: 5 }) }),
    );
  });

  it("offers a route back to the spaces list, which the breadcrumb serves rather than a bare back link, so the header also states where this space sits", () => {
    render(<SpaceDetailPage spaceId={5} />);

    expect(screen.getByRole("link", { name: /^team folders$/i })).toHaveAttribute(
      "href",
      KB_SPACES,
    );
    expect(screen.getByRole("link", { name: /^docs$/i })).toBeInTheDocument();
  });

  it("renders a badge for a public space with the public audience indicator", () => {
    mockKbSpace.mockReturnValue(spaceQuery({ data: spaceData({ audience: "public" as const }) }));

    render(<SpaceDetailPage spaceId={5} />);

    expect(screen.getByText("Public")).toBeInTheDocument();
  });

  it("BITE: renders the lazy page hierarchy alongside the flat page collection", () => {
    render(<SpaceDetailPage spaceId={5} />);

    expect(screen.getByTestId("page-tree")).toBeInTheDocument();
    expect(screen.getByTestId("page-collection")).toBeInTheDocument();
  });

  it("opens a space-scoped hierarchy on mobile and closes it after selecting a page", async () => {
    render(<SpaceDetailPage spaceId={5} />);

    await userEvent.click(screen.getByRole("button", { name: "Browse hierarchy" }));
    expect(screen.getByRole("dialog", { name: "Hierarchy" })).toBeInTheDocument();
    expect(mockPageTree).toHaveBeenCalledWith(
      expect.objectContaining({ spaceId: 5, onCloseMobile: expect.any(Function) }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Select page" }));
    expect(screen.queryByRole("dialog", { name: "Hierarchy" })).not.toBeInTheDocument();
  });

  it("BITE: renders KbNewMenu scoped to this space with allowFolder=false", () => {
    render(<SpaceDetailPage spaceId={5} />);

    expect(mockKbNewMenu).toHaveBeenCalledWith(
      expect.objectContaining({
        scope: expect.objectContaining({ spaceId: 5 }),
        allowFolder: false,
      }),
    );
  });

  it("does not render KbNewMenu in the header while loading (space not yet ready)", () => {
    mockKbSpace.mockReturnValue(spaceQuery({ isLoading: true, data: undefined }));

    render(<SpaceDetailPage spaceId={5} />);

    expect(mockKbNewMenu).not.toHaveBeenCalled();
  });

  it("BITE: shows Members and Archive actions to a space manager, and opens the members sheet", async () => {
    mockCan.mockImplementation((key) => key === "kb:spaces:manage");

    render(<SpaceDetailPage spaceId={5} />);
    expect(screen.getByRole("button", { name: /Members/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Archive/i })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Members/i }));
    expect(screen.getByTestId("members-sheet")).toHaveTextContent("Members — Engineering Hub");
  });

  it("hides Members and Archive actions from a non-manager", () => {
    render(<SpaceDetailPage spaceId={5} />);

    expect(screen.queryByRole("button", { name: /Members/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Archive/i })).not.toBeInTheDocument();
  });

  it("BITE: shows a Restore action instead of Archive once the space is archived", () => {
    mockCan.mockImplementation((key) => key === "kb:spaces:manage");
    mockKbSpace.mockReturnValue(spaceQuery({ data: spaceData({ archivedAt: "2026-09-01T00:00:00.000Z" }) }));

    render(<SpaceDetailPage spaceId={5} />);

    expect(screen.getByRole("button", { name: /Restore/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Archive$/i })).not.toBeInTheDocument();
    expect(screen.getByText("Archived")).toBeInTheDocument();
  });

  it("BITE: opens an archive confirm dialog with the impact preview wired in when Archive is pressed", async () => {
    mockCan.mockImplementation((key) => key === "kb:spaces:manage");

    render(<SpaceDetailPage spaceId={5} />);
    await userEvent.click(screen.getByRole("button", { name: /^Archive$/i }));

    expect(screen.getByText(/Archiving "Engineering Hub" will hide it from users/)).toBeInTheDocument();
  });

  it("BITE: shows the health summary stat cards to a manager when pages carry a review policy", () => {
    mockCanState.mockImplementation((key: string) =>
      key === "kb:spaces:manage" ? "allowed" : "denied",
    );
    mockKbSpace.mockReturnValue(
      spaceQuery({
        data: spaceData({ pagesWithReviewPolicy: 8, pagesOverdueForReview: 3 }),
      }),
    );

    render(<SpaceDetailPage spaceId={5} />);

    expect(screen.getByText("Under review policy")).toBeInTheDocument();
    expect(screen.getByText("Overdue for review")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("BITE: renders the owner display name when ownerName is present (CONTROL: owner meta absent when ownerName is null)", () => {
    mockKbSpace.mockReturnValue(
      spaceQuery({ data: spaceData({ ownerName: "Alice Chen" }) }),
    );

    const { unmount } = render(<SpaceDetailPage spaceId={5} />);
    expect(screen.getByText(/Alice Chen/)).toBeInTheDocument();
    expect(screen.getByText(/Owner:/i)).toBeInTheDocument();
    unmount();

    mockKbSpace.mockReturnValue(
      spaceQuery({ data: spaceData({ ownerName: null }) }),
    );
    render(<SpaceDetailPage spaceId={5} />);
    expect(screen.queryByText(/Alice Chen/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Owner:/i)).not.toBeInTheDocument();
  });

  it("renders the last-updated time through kbTimeAgo, not an inline toLocaleDateString call", () => {
    mockKbSpace.mockReturnValue(
      spaceQuery({ data: spaceData({ updatedAt: "2026-09-25T12:00:00.000Z" }) }),
    );

    render(<SpaceDetailPage spaceId={5} />);

    expect(mockKbTimeAgo).toHaveBeenCalledWith("2026-09-25T12:00:00.000Z");
    expect(screen.getByText(/Updated 1d ago/i)).toBeInTheDocument();
  });

  it("BITE: shows manager health stat cards to a manager with review policy pages (CONTROL: absent when permission is denied)", () => {
    mockCanState.mockImplementation((key: string) =>
      key === "kb:spaces:manage" ? "allowed" : "denied",
    );
    mockKbSpace.mockReturnValue(
      spaceQuery({
        data: spaceData({ pagesWithReviewPolicy: 12, pagesOverdueForReview: 4 }),
      }),
    );

    const { unmount } = render(<SpaceDetailPage spaceId={5} />);
    expect(screen.getByText("Under review policy")).toBeInTheDocument();
    expect(screen.getByText("Overdue for review")).toBeInTheDocument();
    unmount();

    mockCanState.mockReturnValue("denied");
    render(<SpaceDetailPage spaceId={5} />);
    expect(screen.queryByText("Under review policy")).not.toBeInTheDocument();
    expect(screen.queryByText("Overdue for review")).not.toBeInTheDocument();
  });

  it("S07: renders an access badge showing the viewer's role when viewerSpaceRole is present (CONTROL: badge absent when viewerSpaceRole is null)", () => {
    mockKbSpace.mockReturnValue(
      spaceQuery({ data: spaceData({ viewerSpaceRole: "editor" } as Record<string, unknown>) }),
    );

    render(<SpaceDetailPage spaceId={5} />);

    expect(screen.getByText("Editor")).toBeInTheDocument();

    mockKbSpace.mockReturnValue(
      spaceQuery({ data: spaceData({ viewerSpaceRole: null } as Record<string, unknown>) }),
    );
    const { unmount } = render(<SpaceDetailPage spaceId={5} />);
    const editorBadges = screen.queryAllByText("Editor");
    expect(editorBadges).toHaveLength(1);
    unmount();
  });
});
