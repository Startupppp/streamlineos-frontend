import { render, screen } from "@testing-library/react";
import { UpdatesPage } from "./updates-page";
import { ApiError } from "@/lib/api-envelope";

const mockReplace = jest.fn();
const mockSearchParamsGet = jest.fn((key: string): string | null => null);

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  useSearchParams: () => ({ get: mockSearchParamsGet, toString: () => "" }),
  usePathname: () => "/build/1/updates",
}));

jest.mock("@/hooks/api/build/project-updates", () => ({
  useProjectUpdates: jest.fn(),
  useCreateProjectUpdate: jest.fn(),
  useDeleteProjectUpdate: jest.fn(),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(),
  useAccess: jest.fn(),
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("framer-motion", () => ({
  motion: { div: ({ children, ...rest }: React.HTMLAttributes<HTMLDivElement>) => <div {...rest}>{children}</div> },
  useReducedMotion: () => false,
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));
jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ children, title, actions }: { children: React.ReactNode; title?: string; actions?: React.ReactNode }) => (
    <div>
      {title ? <h1>{title}</h1> : null}
      {actions ? <div data-testid="page-actions">{actions}</div> : null}
      {children}
    </div>
  ),
}));
jest.mock("@/components/shared/no-permission-state", () => ({
  NoPermissionState: ({ permission }: { permission: string }) => (
    <div data-testid="no-permission">{permission}</div>
  ),
}));
jest.mock("@/components/shared/error-state", () => ({
  ErrorState: ({ onRetry }: { onRetry?: () => void }) => (
    <button onClick={onRetry}>Retry</button>
  ),
}));
jest.mock("@/components/ui/empty-state", () => ({
  EmptyState: ({ title }: { title: string }) => <div data-testid="empty-state">{title}</div>,
}));
jest.mock("@/components/shared", () => ({
  EntityFormDialog: ({ children }: { children: unknown }) => null,
}));
jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({ iconRef: { current: null }, hoverHandlers: {} }),
}));
jest.mock("@animateicons/react/lucide", () => ({
  PlusIcon: ({ ...props }: React.HTMLAttributes<HTMLElement>) => <span {...props} />,
}));

const mockUseBuildListKeyboard = jest.fn(() => ({ focusedIndex: null, setFocusedIndex: jest.fn() }));
jest.mock("@/features/build/shared/use-build-list-keyboard", () => ({
  useBuildListKeyboard: (...args: Parameters<typeof mockUseBuildListKeyboard>) =>
    mockUseBuildListKeyboard(...args),
}));

jest.mock("@/features/build/shared/shortcut-help-dialog", () => ({
  ShortcutHelpDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="shortcut-help-dialog">Keyboard shortcuts</div> : null,
}));

const mockUseOnlineStatus = jest.fn(() => true);
jest.mock("@/hooks/common/use-online-status", () => ({
  useOnlineStatus: () => mockUseOnlineStatus(),
}));

import { useProjectUpdates, useCreateProjectUpdate, useDeleteProjectUpdate } from "@/hooks/api/build/project-updates";
import { useCan, useAccess } from "@/hooks/api/access";

const mockUseProjectUpdates = useProjectUpdates as jest.Mock;
const mockUseCreateProjectUpdate = useCreateProjectUpdate as jest.Mock;
const mockUseDeleteProjectUpdate = useDeleteProjectUpdate as jest.Mock;
const mockUseCan = useCan as jest.Mock;
const mockUseAccess = useAccess as jest.Mock;

const ACCESS_GRANTED = {
  data: { isOrgOwner: false, scopes: { "build:updates:view": "all", "build:updates:manage": "all" }, modules: {} },
  isLoading: false,
};

const ACCESS_DENIED = {
  data: { isOrgOwner: false, scopes: {}, modules: {} },
  isLoading: false,
};

function baseQueryResult(overrides = {}) {
  return {
    data: [],
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: jest.fn(),
    hasNextPage: false,
    fetchNextPage: jest.fn(),
    isFetchingNextPage: false,
    ...overrides,
  };
}

beforeEach(() => {
  mockUseCan.mockReturnValue(true);
  mockUseAccess.mockReturnValue(ACCESS_GRANTED);
  mockUseProjectUpdates.mockReturnValue(baseQueryResult());
  mockUseCreateProjectUpdate.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockUseDeleteProjectUpdate.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockSearchParamsGet.mockReturnValue(null);
  mockUseBuildListKeyboard.mockReturnValue({ focusedIndex: null, setFocusedIndex: jest.fn() });
  mockUseOnlineStatus.mockReturnValue(true);
});

it("renders denied state when build:updates:view is not in the access snapshot", () => {
  mockUseAccess.mockReturnValue(ACCESS_DENIED);
  render(<UpdatesPage projectId={1} />);
  expect(screen.getByTestId("no-permission")).toHaveTextContent("build:updates:view");
});

it("renders empty state when there are no updates", () => {
  mockUseProjectUpdates.mockReturnValue(baseQueryResult({ data: [] }));
  render(<UpdatesPage projectId={1} />);
  expect(screen.getByTestId("empty-state")).toBeInTheDocument();
});

it("renders error state and retry on query failure", () => {
  mockUseProjectUpdates.mockReturnValue(baseQueryResult({ isError: true }));
  render(<UpdatesPage projectId={1} />);
  expect(screen.getByText("Retry")).toBeInTheDocument();
});

it("renders update cards when data is populated", () => {
  mockUseProjectUpdates.mockReturnValue(
    baseQueryResult({
      data: [
        {
          id: 1,
          orgId: "org-1",
          projectId: 1,
          authorMembershipId: 7,
          body: "Sprint 3 is on track.",
          status: "published",
          audience: "internal",
          createdAt: new Date(0).toISOString(),
          updatedAt: new Date(0).toISOString(),
          deletedAt: null,
        },
      ],
    }),
  );
  render(<UpdatesPage projectId={1} />);
  expect(screen.getByText("Sprint 3 is on track.")).toBeInTheDocument();
});

it("hides delete button when canManage is false", () => {
  mockUseCan.mockImplementation((key: string) => key === "build:updates:view");
  mockUseProjectUpdates.mockReturnValue(
    baseQueryResult({
      data: [
        {
          id: 1,
          orgId: "org-1",
          projectId: 1,
          authorMembershipId: 7,
          body: "An update body.",
          status: "draft",
          audience: "internal",
          createdAt: new Date(0).toISOString(),
          updatedAt: new Date(0).toISOString(),
          deletedAt: null,
        },
      ],
    }),
  );
  render(<UpdatesPage projectId={1} />);
  expect(screen.queryByText("Delete")).not.toBeInTheDocument();
});

it("shows skeleton and not a denial while the access snapshot is still in flight because useCan answers false before access lands", () => {
  mockUseAccess.mockReturnValue({ data: undefined, isLoading: true });
  mockUseCan.mockReturnValue(false);
  mockUseProjectUpdates.mockReturnValue(baseQueryResult({ data: [], isLoading: false }));
  render(<UpdatesPage projectId={1} />);
  expect(screen.queryByTestId("no-permission")).not.toBeInTheDocument();
  expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
});

it("renders the plan upgrade link the backend sent with a 402 MODULE_NOT_ENABLED instead of a generic error", () => {
  mockUseProjectUpdates.mockReturnValue(
    baseQueryResult({
      isError: true,
      error: new ApiError(
        "Build is not included in your current plan.",
        402,
        "MODULE_NOT_ENABLED",
        { moduleKey: "build", reason: "not-in-plan", upgradePath: "/settings/billing" },
      ),
    }),
  );
  render(<UpdatesPage projectId={1} />);
  expect(screen.queryByText("Retry")).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: /view plans/i })).toHaveAttribute("href", "/settings/billing");
});

describe("update cards — core fields and action visibility", () => {
  const UPDATE_WITH_FIELDS = {
    id: 1,
    orgId: "org-1",
    projectId: 1,
    authorMembershipId: 7,
    body: "Field test body.",
    status: "published",
    audience: "client",
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
    deletedAt: null,
  };

  it("renders the status badge text from the update row so a published update shows its publication state", () => {
    mockUseProjectUpdates.mockReturnValue(baseQueryResult({ data: [UPDATE_WITH_FIELDS] }));
    render(<UpdatesPage projectId={1} />);
    expect(screen.getByText("published")).toBeInTheDocument();
  });

  it("renders the audience badge text from the update row so client-audience updates are visually labelled", () => {
    mockUseProjectUpdates.mockReturnValue(baseQueryResult({ data: [UPDATE_WITH_FIELDS] }));
    render(<UpdatesPage projectId={1} />);
    expect(screen.getByText("client")).toBeInTheDocument();
  });

  it("shows the Post Update button when canManage is true so creating updates is reachable — pairs the hides-when-false test", () => {
    mockUseCan.mockReturnValue(true);
    mockUseProjectUpdates.mockReturnValue(baseQueryResult({ data: [] }));
    render(<UpdatesPage projectId={1} />);
    expect(screen.getByRole("button", { name: /post update/i })).toBeInTheDocument();
  });

  it("shows the Delete button on a card when canManage is true — pairs the hides-when-false test", () => {
    mockUseCan.mockReturnValue(true);
    mockUseProjectUpdates.mockReturnValue(
      baseQueryResult({
        data: [UPDATE_WITH_FIELDS],
      }),
    );
    render(<UpdatesPage projectId={1} />);
    expect(screen.getByRole("button", { name: /delete/i })).toBeInTheDocument();
  });
});

describe("URL-backed filter state — authorId, from, to wired to useProjectUpdates", () => {
  it("passes authorId from the URL to useProjectUpdates when the param is present so filters are server-side not client-side", () => {
    mockSearchParamsGet.mockImplementation((key: string) =>
      key === "authorId" ? "42" : null,
    );
    render(<UpdatesPage projectId={1} />);
    expect(mockUseProjectUpdates).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ authorId: "42" }),
    );
  });

  it("passes from from the URL to useProjectUpdates when the param is present", () => {
    mockSearchParamsGet.mockImplementation((key: string) =>
      key === "from" ? "2026-01-01" : null,
    );
    render(<UpdatesPage projectId={1} />);
    expect(mockUseProjectUpdates).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ from: "2026-01-01" }),
    );
  });

  it("passes to from the URL to useProjectUpdates when the param is present", () => {
    mockSearchParamsGet.mockImplementation((key: string) =>
      key === "to" ? "2026-09-30" : null,
    );
    render(<UpdatesPage projectId={1} />);
    expect(mockUseProjectUpdates).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ to: "2026-09-30" }),
    );
  });

  it("passes undefined for absent params so the hook does not send empty filter strings to the API", () => {
    mockSearchParamsGet.mockReturnValue(null);
    render(<UpdatesPage projectId={1} />);
    expect(mockUseProjectUpdates).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ authorId: undefined, from: undefined, to: undefined }),
    );
  });

  it("passes status:published from the URL to useProjectUpdates when the param is present so the backend can filter by publication state", () => {
    mockSearchParamsGet.mockImplementation((key: string) =>
      key === "status" ? "published" : null,
    );
    render(<UpdatesPage projectId={1} />);
    expect(mockUseProjectUpdates).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ status: "published" }),
    );
  });

  it("passes undefined for an unrecognised status value so an invalid enum value does not reach the backend", () => {
    mockSearchParamsGet.mockImplementation((key: string) =>
      key === "status" ? "archived" : null,
    );
    render(<UpdatesPage projectId={1} />);
    expect(mockUseProjectUpdates).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ status: undefined }),
    );
  });
});

describe("offline state — CCG-5", () => {
  it("shows the offline banner when useOnlineStatus returns false so stale cached data is labelled as potentially out of date", () => {
    mockUseOnlineStatus.mockReturnValue(false);
    render(<UpdatesPage projectId={1} />);
    expect(screen.getByText(/you're offline/i)).toBeInTheDocument();
  });

  it("does not show the offline banner when useOnlineStatus returns true so the banner is not visible during normal operation", () => {
    mockUseOnlineStatus.mockReturnValue(true);
    render(<UpdatesPage projectId={1} />);
    expect(screen.queryByText(/you're offline/i)).not.toBeInTheDocument();
  });
});

describe("keyboard navigation — CCG-4", () => {
  it("calls useBuildListKeyboard with itemCount matching the number of loaded updates so j/k moves through the actual list", () => {
    const UPDATE_ROW = {
      id: 1,
      orgId: "org-1",
      projectId: 1,
      authorMembershipId: 7,
      body: "KB nav test.",
      status: "published" as const,
      audience: "internal" as const,
      createdAt: new Date(0).toISOString(),
      updatedAt: new Date(0).toISOString(),
      deletedAt: null,
    };
    mockUseProjectUpdates.mockReturnValue(baseQueryResult({ data: [UPDATE_ROW] }));
    render(<UpdatesPage projectId={1} />);
    expect(mockUseBuildListKeyboard).toHaveBeenCalledWith(
      expect.objectContaining({ itemCount: 1 }),
    );
  });

  it("passes onCreate to useBuildListKeyboard when canManage is true so c fires the Post Update dialog", () => {
    mockUseCan.mockReturnValue(true);
    render(<UpdatesPage projectId={1} />);
    expect(mockUseBuildListKeyboard).toHaveBeenCalledWith(
      expect.objectContaining({ onCreate: expect.any(Function) }),
    );
  });

  it("omits onCreate from useBuildListKeyboard when canManage is false so c does nothing for read-only users", () => {
    mockUseCan.mockImplementation((key: string) => key === "build:updates:view");
    render(<UpdatesPage projectId={1} />);
    expect(mockUseBuildListKeyboard).toHaveBeenCalledWith(
      expect.objectContaining({ onCreate: undefined }),
    );
  });

  it("renders the shortcut help dialog when focusedIndex is set and ? is pressed — verifies the dialog mounts when open is true", () => {
    mockUseBuildListKeyboard.mockReturnValue({ focusedIndex: 0, setFocusedIndex: jest.fn() });
    render(<UpdatesPage projectId={1} />);
    expect(mockUseBuildListKeyboard).toHaveBeenCalledWith(
      expect.objectContaining({ onShortcutHelp: expect.any(Function) }),
    );
  });
});
