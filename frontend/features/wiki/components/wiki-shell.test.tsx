import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiError } from "@/lib/api-envelope";
import WikiShell from "./wiki-shell";

const mockFavorites = jest.fn();
const mockCanState = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("@/hooks/api/kb", () => ({
  useKbPagesFavorites: () => mockFavorites(),
  useCreateKbPage: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
  useCanState: () => mockCanState(),
}));

jest.mock("@/hooks/api/kb/hr-link-config", () => ({
  useHrKbLinkFlags: () => ({ link: false }),
}));

jest.mock("@/components/layout/shell-sidebar-collapse-context", () => ({
  useShellSidebarCollapse: () => ({ isCollapsed: false }),
}));

jest.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("./page-tree", () => ({
  __esModule: true,
  default: () => <div>Page tree</div>,
}));

jest.mock("./quick-find-dialog", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("./wiki-sidebar-nav", () => ({
  __esModule: true,
  default: () => <div>Wiki navigation</div>,
  WikiSidebarFooter: () => null,
}));

jest.mock("./wiki-sidebar-chrome", () => ({
  WikiCollapsedSidebarChrome: () => null,
}));

jest.mock("@/features/wiki/lib/kb-icons", () => ({
  KbStarIcon: () => <span />,
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockCanState.mockReturnValue("granted");
});

it("shows a request reference and retries a failed first Favorites read", async () => {
  const refetch = jest.fn();
  mockFavorites.mockReturnValue({
    data: [],
    isError: true,
    error: new ApiError("Unavailable", 503, "BACKEND_UNREACHABLE", { correlationId: "favorites-first" }),
    refetch,
    hasNextPage: false,
    fetchNextPage: jest.fn(),
  });

  render(<WikiShell><div>Wiki body</div></WikiShell>);

  expect(screen.getByText("Couldn't load favorites")).toBeInTheDocument();
  expect(screen.getByText("favorites-first")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(refetch).toHaveBeenCalledTimes(1);
});

it("retains loaded Favorites and retries only a failed later cursor page", async () => {
  const refetch = jest.fn();
  const fetchNextPage = jest.fn();
  mockFavorites.mockReturnValue({
    data: [{ id: 42, title: "Runbook", icon: null }],
    isError: true,
    isFetchNextPageError: true,
    error: new ApiError("Unavailable", 503, "BACKEND_UNREACHABLE", { correlationId: "favorites-later" }),
    refetch,
    hasNextPage: true,
    fetchNextPage,
  });

  render(<WikiShell><div>Wiki body</div></WikiShell>);

  expect(screen.getByRole("link", { name: "Runbook" })).toBeInTheDocument();
  expect(screen.getByText("Couldn't load more favorites")).toBeInTheDocument();
  expect(screen.getByText("favorites-later")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Load more favorites" })).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(fetchNextPage).toHaveBeenCalledTimes(1);
  expect(refetch).not.toHaveBeenCalled();
});

it("hides cached Favorites when the permission snapshot denies access", () => {
  mockCanState.mockReturnValue("denied");
  mockFavorites.mockReturnValue({
    data: [{ id: 42, title: "Runbook", icon: null }],
    isError: false,
    hasNextPage: false,
  });

  render(<WikiShell><div>Wiki body</div></WikiShell>);

  expect(screen.queryByRole("link", { name: "Runbook" })).not.toBeInTheDocument();
  expect(screen.queryByText("Favorites")).not.toBeInTheDocument();
});

it("hides cached Favorites when a read reports revoked access", () => {
  mockFavorites.mockReturnValue({
    data: [{ id: 42, title: "Runbook", icon: null }],
    isError: true,
    error: new ApiError("Access revoked", 403, "FORBIDDEN", { correlationId: "favorites-revoked" }),
    refetch: jest.fn(),
    hasNextPage: false,
  });

  render(<WikiShell><div>Wiki body</div></WikiShell>);

  expect(screen.queryByRole("link", { name: "Runbook" })).not.toBeInTheDocument();
  expect(screen.getByText("favorites-revoked")).toBeInTheDocument();
});
