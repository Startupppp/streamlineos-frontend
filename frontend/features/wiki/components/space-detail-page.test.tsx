import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiError } from "@/lib/api-envelope";
import SpaceDetailPage from "./space-detail-page";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => "/knowledge/wiki/spaces/1",
  useSearchParams: () => new URLSearchParams(),
}));

const mockCan = jest.fn<boolean, [string]>();
const mockAccess = jest.fn();
jest.mock("@/hooks/api/access", () => ({
  useCan: (key: string) => mockCan(key),
  useAccess: () => mockAccess(),
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

jest.mock("./page-tree", () => ({
  __esModule: true,
  default: () => <div data-testid="page-tree" />,
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
  mockKbSpace.mockReturnValue(spaceQuery());
  mockArchive.mockReturnValue(mutation());
  mockRestore.mockReturnValue(mutation());
  mockCreatePage.mockReturnValue(mutation());
  mockPageCollection.mockImplementation(() => undefined);
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

  it("renders the not-found recovery state for a 404 response, not a generic error", () => {
    mockKbSpace.mockReturnValue(
      spaceQuery({
        data: undefined,
        isError: true,
        error: new ApiError("Not Found", 404, "NOT_FOUND", {}, "/kb/spaces/5"),
      }),
    );

    render(<SpaceDetailPage spaceId={5} />);

    expect(screen.getByText("Space not found")).toBeInTheDocument();
    expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();
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

  it("renders the back link to the spaces list", () => {
    render(<SpaceDetailPage spaceId={5} />);

    expect(screen.getByRole("link", { name: /back/i })).toBeInTheDocument();
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

  it("BITE: shows a New page button that creates a page scoped to this space when the actor can create pages", async () => {
    mockCan.mockImplementation((key) => key === "kb:pages:create");
    const createMutate = jest.fn();
    mockCreatePage.mockReturnValue(mutation({ mutate: createMutate }));

    render(<SpaceDetailPage spaceId={5} />);
    await userEvent.click(screen.getByRole("button", { name: /New page/i }));

    expect(createMutate).toHaveBeenCalledWith(
      { spaceId: 5 },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    );
  });

  it("hides the New page button when the actor cannot create pages", () => {
    render(<SpaceDetailPage spaceId={5} />);

    expect(screen.queryByRole("button", { name: /New page/i })).not.toBeInTheDocument();
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

  it("BITE: shows the review-policy summary to a manager when pages carry a review policy", () => {
    mockCan.mockImplementation((key) => key === "kb:spaces:manage");
    mockKbSpace.mockReturnValue(
      spaceQuery({
        data: spaceData({ pagesWithReviewPolicy: 8, pagesOverdueForReview: 3 }),
      }),
    );

    render(<SpaceDetailPage spaceId={5} />);

    expect(screen.getByText(/8 pages under review policy/)).toBeInTheDocument();
    expect(screen.getByText(/3 overdue/)).toBeInTheDocument();
  });
});
