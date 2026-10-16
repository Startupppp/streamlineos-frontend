import { fireEvent, render, screen } from "@testing-library/react";
import { ApiError } from "@/lib/api-envelope";
import { permissionGate } from "@/lib/rbac/permission-gate";
import { KbManagerContent } from "./kb-manager-content";

let searchParams = new URLSearchParams();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  usePathname: () => "/support/kb",
  useSearchParams: () => searchParams,
}));

const useSupportKbArticles = jest.fn();
const useSupportKbCategories = jest.fn();
const useAccess = jest.fn();

jest.mock("@/hooks/api/support/kb", () => ({
  useSupportKbArticles: (...args: unknown[]) => useSupportKbArticles(...args),
  useSupportKbCategories: (...args: unknown[]) =>
    useSupportKbCategories(...args),
  useDeleteSupportKbArticle: () => ({ mutate: jest.fn(), isPending: false }),
  useDeleteSupportKbCategory: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("@/hooks/api/support/kb-rag", () => ({
  useReindexAllSupportKb: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("@/hooks/api/access", () => ({
  useAccess: () => useAccess(),
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));

jest.mock("@/components/support/kb-ask-panel", () => ({
  KbAskPanel: () => <div data-testid="kb-ask-panel" />,
}));

jest.mock("./kb-analytics-tab", () => ({
  KbAnalyticsTab: () => <div data-testid="kb-analytics-tab" />,
}));

const ALLOWED = permissionGate("support:kb:view", true, true);
const DENIED = permissionGate("support:kb:view", false, true);
const PENDING = permissionGate("support:kb:view", false, false);

const ARTICLE = {
  id: 1,
  title: "Resetting your password",
  slug: "resetting-your-password",
  status: "published",
  visibility: "public",
  categoryId: null,
  viewCount: 4,
  helpfulCount: 1,
  notHelpfulCount: 0,
  updatedAt: "2026-01-01T00:00:00Z",
};

function listQuery(overrides: Record<string, unknown>) {
  return {
    data: [],
    error: null,
    isLoading: false,
    isFetching: false,
    refetch: jest.fn(),
    access: ALLOWED,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  searchParams = new URLSearchParams();
  useAccess.mockReturnValue({
    data: { isOrgOwner: false, scopes: { "support:kb:view": "all" }, modules: { support: true } },
    isLoading: false,
  });
  useSupportKbArticles.mockReturnValue(listQuery({}));
  useSupportKbCategories.mockReturnValue(listQuery({}));
});

describe("KbManagerContent — a refused article read is not an empty knowledge base", () => {
  it("renders the article list when the read is permitted and returns rows, so the negative cases below are not vacuous", () => {
    useSupportKbArticles.mockReturnValue(listQuery({ data: [ARTICLE] }));

    render(<KbManagerContent />);

    expect(screen.getByText("Resetting your password")).toBeInTheDocument();
  });

  it("says the knowledge base is empty when the read is permitted and genuinely returns nothing", () => {
    render(<KbManagerContent />);

    expect(screen.getByText("No articles yet")).toBeInTheDocument();
  });

  it("shows filtered empty when an allowed filtered article read returns no rows", () => {
    searchParams = new URLSearchParams("status=draft");

    render(<KbManagerContent />);

    expect(screen.getByText("No articles match your filters")).toBeInTheDocument();
    expect(screen.queryByText("No articles yet")).not.toBeInTheDocument();
  });

  it("refuses to claim emptiness when support:kb:view is denied, and states the refusal instead", () => {
    useAccess.mockReturnValue({
      data: { isOrgOwner: false, scopes: {}, modules: { support: true } },
      isLoading: false,
    });
    useSupportKbArticles.mockReturnValue(listQuery({ access: DENIED }));

    render(<KbManagerContent />);

    expect(screen.queryByText("No articles yet")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /access/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "New Article" })).not.toBeInTheDocument();
  });

  it("shows loading rather than emptiness while the gate is pending", () => {
    useAccess.mockReturnValue({ data: undefined, isLoading: true });
    useSupportKbArticles.mockReturnValue(listQuery({ access: PENDING }));

    render(<KbManagerContent />);

    expect(screen.queryByText("No articles yet")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /access/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "New Article" })).not.toBeInTheDocument();
  });

  it("does not let a denial masquerade as the filtered-empty state either", () => {
    searchParams = new URLSearchParams("status=draft");
    useAccess.mockReturnValue({
      data: { isOrgOwner: false, scopes: {}, modules: { support: true } },
      isLoading: false,
    });
    useSupportKbArticles.mockReturnValue(listQuery({ access: DENIED }));

    render(<KbManagerContent />);

    expect(
      screen.queryByText("No articles match your filters"),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /access/i })).toBeInTheDocument();
  });
});

describe("KbManagerContent — the article load failure quotes its request id", () => {
  it("shows the correlation id of the failed article read so the user can quote it to support", () => {
    useSupportKbArticles.mockReturnValue(
      listQuery({
        error: new ApiError("Upstream exploded", 500, "INTERNAL", {
          correlationId: "req_kb_articles_42",
        }),
      }),
    );

    render(<KbManagerContent />);

    expect(screen.getByText("req_kb_articles_42")).toBeInTheDocument();
  });

  it("shows no reference line when the article error carries no correlation id, so the reference is evidence and not decoration", () => {
    useSupportKbArticles.mockReturnValue(
      listQuery({ error: new Error("network down") }),
    );

    render(<KbManagerContent />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.queryByText("Reference")).not.toBeInTheDocument();
  });
});

describe("KbManagerContent — category tab states", () => {
  beforeEach(() => {
    searchParams = new URLSearchParams("tab=categories");
  });

  it("shows the first-empty category state when the read succeeds", () => {
    render(<KbManagerContent />);

    expect(screen.getByText("No categories yet")).toBeInTheDocument();
  });

  it("shows loading while category permission is pending", () => {
    useAccess.mockReturnValue({ data: undefined, isLoading: true });
    useSupportKbCategories.mockReturnValue(listQuery({ access: PENDING }));

    render(<KbManagerContent />);

    expect(screen.queryByText("No categories yet")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "New Category" })).not.toBeInTheDocument();
  });

  it("shows the category request id and retries the failing read", () => {
    const refetch = jest.fn();
    useSupportKbCategories.mockReturnValue(listQuery({
      error: new ApiError("Category read failed", 500, "INTERNAL", { correlationId: "req_kb_categories_7" }),
      refetch,
    }));

    render(<KbManagerContent />);

    expect(screen.getByText("req_kb_categories_7")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("shows denial without the empty state or creation controls", () => {
    useAccess.mockReturnValue({
      data: { isOrgOwner: false, scopes: {}, modules: { support: true } },
      isLoading: false,
    });
    useSupportKbCategories.mockReturnValue(listQuery({ access: DENIED }));

    render(<KbManagerContent />);

    expect(screen.getByRole("heading", { name: "Access Restricted" })).toBeInTheDocument();
    expect(screen.queryByText("No categories yet")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "New Category" })).not.toBeInTheDocument();
  });
});

describe("KbManagerContent — category collection pagination", () => {
  it("offers more category options when the server has another page", () => {
    const fetchNextPage = jest.fn();
    useSupportKbCategories.mockReturnValue(listQuery({
      data: [{ id: 1, name: "Guides", description: null, isPublished: true }],
      hasNextPage: true,
      isFetchingNextPage: false,
      fetchNextPage,
    }));

    render(<KbManagerContent />);

    fireEvent.click(screen.getByRole("button", { name: "Load more categories" }));
    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });

  it("does not offer category paging while permission is denied", () => {
    useSupportKbCategories.mockReturnValue(listQuery({
      access: DENIED,
      hasNextPage: true,
      fetchNextPage: jest.fn(),
    }));

    render(<KbManagerContent />);

    expect(screen.queryByRole("button", { name: "Load more categories" })).not.toBeInTheDocument();
  });
});
