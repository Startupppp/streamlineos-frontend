import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiError } from "@/lib/api-envelope";
import SpaceDetailPage from "./space-detail-page";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => "/knowledge/wiki/spaces/1",
  useSearchParams: () => new URLSearchParams(),
}));

const mockAccess = jest.fn();
jest.mock("@/hooks/api/access", () => ({
  useCan: () => false,
  useAccess: () => mockAccess(),
}));
jest.mock("@/hooks/api/entitlements", () => ({ useEntitlements: () => ({ data: undefined }) }));

const mockKbSpace = jest.fn();
jest.mock("@/hooks/api/kb/spaces", () => ({
  useKbSpace: (spaceId: number) => mockKbSpace(spaceId),
}));

const mockPageCollection = jest.fn();
jest.mock("./wiki-page-collection-table", () => ({
  WikiPageCollectionTable: (props: unknown) => {
    mockPageCollection(props);
    return <div data-testid="page-collection" />;
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

beforeEach(() => {
  jest.clearAllMocks();
  mockAccess.mockReturnValue({ data: { isOrgOwner: true, scopes: {}, modules: {} }, isLoading: false });
  mockKbSpace.mockReturnValue(spaceQuery());
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
});
