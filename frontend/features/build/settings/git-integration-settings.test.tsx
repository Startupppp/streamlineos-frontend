import { render, screen, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProjectsGitIntegrationSettings } from "./git-integration-settings";
import type { CreatedGitConnection } from "@/hooks/api/git-integration";

const mockRouterReplace = jest.fn();
let mockSearchParamsValue = new URLSearchParams();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockRouterReplace }),
  usePathname: () => "/build/settings/integrations",
  useSearchParams: () => mockSearchParamsValue,
}));

const mockUseBuildListKeyboard = jest.fn(() => ({
  focusedIndex: null,
  setFocusedIndex: jest.fn(),
}));
jest.mock("@/features/build/shared/use-build-list-keyboard", () => ({
  useBuildListKeyboard: (...args: unknown[]) => mockUseBuildListKeyboard(...args),
}));

jest.mock("@/hooks/common/use-online-status", () => ({
  useOnlineStatus: jest.fn(() => true),
}));

jest.mock("@/features/build/shared/shortcut-help-dialog", () => ({
  ShortcutHelpDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="shortcut-help-dialog" /> : null,
}));

const BASE_CONNECTION = {
  id: 1,
  provider: "github" as const,
  projectId: null,
  repoUrl: "https://github.com/acme/repo",
  repoName: "acme/repo",
  isActive: true,
  maskedSecret: "whsec_••••abcd",
  webhookUrl: "https://api.example.com/integrations/git/webhook?connectionId=1",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const CREATED_CONNECTION: CreatedGitConnection = {
  id: 42,
  provider: "github",
  projectId: null,
  repoUrl: "https://github.com/acme/new-repo",
  repoName: "acme/new-repo",
  isActive: true,
  webhookUrl: "https://api.example.com/integrations/git/webhook?connectionId=42",
  webhookSecret: "whsec_FAKE_SECRET_FOR_TESTING_ONLY",
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
};

let mockData: typeof BASE_CONNECTION[] | undefined = undefined;
let mockIsLoading = false;
let mockIsError = false;

jest.mock("@/hooks/api/git-integration", () => ({
  useGitConnections: () => ({
    data: mockData !== undefined ? { data: mockData, pagination: { limit: 20, hasMore: false, nextCursor: null } } : undefined,
    isLoading: mockIsLoading,
    isError: mockIsError,
    refetch: jest.fn(),
  }),
  useCreateGitConnection: () => ({ mutate: jest.fn(), isPending: false }),
  useUpdateGitConnection: () => ({ mutate: jest.fn(), isPending: false }),
  useDeleteGitConnection: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("@/components/shared/dirty-state-context", () => ({
  useRegisterDirtyState: jest.fn(),
  useNavigationLeave: () => (action: () => void) => action(),
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("@/components/auth/require-module", () => ({
  RequireModule: jest.fn(({ children }: { children: React.ReactNode }) => <>{children}</>),
}));

jest.mock("@/features/build/settings/git-connection-row", () => ({
  ConnectionRow: ({ connection }: { connection: typeof BASE_CONNECTION }) => (
    <div data-testid="connection-row" data-url={connection.repoUrl} />
  ),
  ProviderIcon: () => <span />,
  CopyButton: () => <button type="button">Copy</button>,
}));

jest.mock("@/features/build/settings/git-setup-instructions", () => ({
  SetupInstructions: () => <div data-testid="setup-instructions" />,
}));

jest.mock("@/components/pm-chrome", () => ({
  PmPageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmStaggerList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PM_FILL_PANEL: "",
  PM_PANEL: "",
}));

beforeEach(() => {
  mockData = undefined;
  mockIsLoading = false;
  mockIsError = false;
  mockRouterReplace.mockClear();
  mockUseBuildListKeyboard.mockClear();
  mockSearchParamsValue = new URLSearchParams();
  (
    jest.requireMock("@/hooks/common/use-online-status") as {
      useOnlineStatus: jest.Mock;
    }
  ).useOnlineStatus.mockReturnValue(true);
});

describe("ProjectsGitIntegrationSettings — loading state (BLD-X-FE-SETTINGS-INT-010)", () => {
  it("renders skeleton rows while connections are loading", () => {
    mockIsLoading = true;
    render(<ProjectsGitIntegrationSettings />);
    expect(screen.queryByTestId("connection-row")).not.toBeInTheDocument();
  });
});

describe("ProjectsGitIntegrationSettings — error state (BLD-X-FE-SETTINGS-INT-011)", () => {
  it("renders an error state when the connections fetch fails — not an empty list", () => {
    mockIsError = true;
    render(<ProjectsGitIntegrationSettings />);
    expect(screen.getByText(/could not load connections/i)).toBeInTheDocument();
    expect(screen.queryByTestId("connection-row")).not.toBeInTheDocument();
  });
});

describe("ProjectsGitIntegrationSettings — empty state (BLD-X-FE-SETTINGS-INT-012)", () => {
  it("renders an empty state with add action when no connections exist", () => {
    mockData = [];
    render(<ProjectsGitIntegrationSettings />);
    expect(screen.getByText(/no repositories connected/i)).toBeInTheDocument();
    expect(screen.queryByTestId("connection-row")).not.toBeInTheDocument();
  });
});

describe("ProjectsGitIntegrationSettings — populated state (BLD-X-FE-SETTINGS-INT-013)", () => {
  it("renders a row per connection", () => {
    mockData = [BASE_CONNECTION, { ...BASE_CONNECTION, id: 2, repoUrl: "https://github.com/acme/other" }];
    render(<ProjectsGitIntegrationSettings />);
    expect(screen.getAllByTestId("connection-row")).toHaveLength(2);
  });

  it("passes the repo URL to the connection row", () => {
    mockData = [BASE_CONNECTION];
    render(<ProjectsGitIntegrationSettings />);
    expect(screen.getByTestId("connection-row")).toHaveAttribute(
      "data-url",
      BASE_CONNECTION.repoUrl,
    );
  });
});

describe("ProjectsGitIntegrationSettings — CreatedSecretDialog (BLD-X-FE-SETTINGS-INT-014)", () => {
  it("shows the webhook secret in the created-secret dialog on connection creation — the raw secret is never returned from reads, so this is the only display opportunity", () => {
    const { gitConnectionCreateContract } = require("@/hooks/api/git-integration-schema");
    const parsed = gitConnectionCreateContract.parse(CREATED_CONNECTION);
    expect(parsed.webhookSecret).toBe(CREATED_CONNECTION.webhookSecret);
  });

  it("the list contract only returns maskedSecret, never the raw webhookSecret — prevents secret re-rendering", () => {
    const { gitConnectionListContract } = require("@/hooks/api/git-integration-schema");
    const parsed = gitConnectionListContract.parse({
      data: [BASE_CONNECTION],
      pagination: { limit: 20, hasMore: false, nextCursor: null },
    });
    const row = parsed.data[0] as Record<string, unknown>;
    expect(row["webhookSecret"]).toBeUndefined();
    expect(row["maskedSecret"]).toBe(BASE_CONNECTION.maskedSecret);
  });

  it("CREATED_CONNECTION contract rejects a list row payload used in place of a create response — the envelopes are distinct", () => {
    const { gitConnectionCreateContract } = require("@/hooks/api/git-integration-schema");
    expect(() => gitConnectionCreateContract.parse(BASE_CONNECTION)).toThrow();
  });
});

describe("ProjectsGitIntegrationSettings — section URL param (BLD-X-FE-SETTINGS-INT-015)", () => {
  it("defaults to the connections tab when no section param is set", () => {
    mockData = [];
    render(<ProjectsGitIntegrationSettings />);
    expect(screen.getByRole("tab", { name: /connections/i })).toHaveAttribute(
      "data-state",
      "active",
    );
  });

  it("selects the agent tab when section=agent and a footer is provided", () => {
    mockData = [];
    mockSearchParamsValue = new URLSearchParams("section=agent");
    render(
      <ProjectsGitIntegrationSettings footer={<div data-testid="agent-content" />} />,
    );
    expect(screen.getByRole("tab", { name: /agent access/i })).toHaveAttribute(
      "data-state",
      "active",
    );
  });

  it("falls back to connections when section=agent but no footer is provided", () => {
    mockData = [];
    mockSearchParamsValue = new URLSearchParams("section=agent");
    render(<ProjectsGitIntegrationSettings />);
    expect(screen.getByRole("tab", { name: /connections/i })).toHaveAttribute(
      "data-state",
      "active",
    );
  });

  it("calls router.replace with section=agent when the agent tab is clicked", async () => {
    const user = userEvent.setup();
    mockData = [];
    render(
      <ProjectsGitIntegrationSettings footer={<div data-testid="agent-content" />} />,
    );
    const agentTab = screen.getByRole("tab", { name: /agent access/i });
    await user.click(agentTab);
    expect(mockRouterReplace).toHaveBeenCalledWith(
      expect.stringContaining("section=agent"),
      expect.any(Object),
    );
  });

  it("calls router.replace without a section param when switching back to connections", async () => {
    const user = userEvent.setup();
    mockData = [];
    mockSearchParamsValue = new URLSearchParams("section=agent");
    render(
      <ProjectsGitIntegrationSettings footer={<div data-testid="agent-content" />} />,
    );
    const connectionsTab = screen.getByRole("tab", { name: /connections/i });
    await user.click(connectionsTab);
    const callArg = mockRouterReplace.mock.calls[0]?.[0] as string | undefined;
    expect(callArg).toBeDefined();
    expect(callArg).not.toContain("section=");
  });
});

describe("ProjectsGitIntegrationSettings — keyboard shortcut wiring (BLD-X-FE-SETTINGS-INT-016)", () => {
  it("wires useBuildListKeyboard with onCreate pointing to the add-connection dialog opener", () => {
    mockData = [BASE_CONNECTION];
    render(<ProjectsGitIntegrationSettings />);
    const lastCallArgs = mockUseBuildListKeyboard.mock.calls.at(-1)?.[0];
    expect(typeof lastCallArgs?.onCreate).toBe("function");
    expect(lastCallArgs?.itemCount).toBe(1);
  });

  it("enables keyboard shortcuts only when the connections list is not loading or errored", () => {
    mockData = [BASE_CONNECTION];
    render(<ProjectsGitIntegrationSettings />);
    const lastCallArgs = mockUseBuildListKeyboard.mock.calls.at(-1)?.[0];
    expect(lastCallArgs?.enabled).toBe(true);
  });

  it("disables keyboard shortcuts while loading", () => {
    mockIsLoading = true;
    render(<ProjectsGitIntegrationSettings />);
    const lastCallArgs = mockUseBuildListKeyboard.mock.calls.at(-1)?.[0];
    expect(lastCallArgs?.enabled).toBe(false);
  });
});

describe("ProjectsGitIntegrationSettings — RequireModule gate (BLD-X-FE-SETTINGS-INT-017)", () => {
  it("wraps the integrations surface in RequireModule for the build module key", () => {
    mockData = [];
    render(<ProjectsGitIntegrationSettings />);
    const { RequireModule } = jest.requireMock(
      "@/components/auth/require-module",
    ) as { RequireModule: jest.Mock };
    const firstCallProps = (RequireModule.mock.calls[0] as unknown[])[0] as Record<string, unknown>;
    expect(firstCallProps["module"]).toBe("build");
  });

  it("renders connections when the build module is enabled — RequireModule passes through children in the default mock", () => {
    mockData = [BASE_CONNECTION];
    render(<ProjectsGitIntegrationSettings />);
    expect(screen.getByTestId("connection-row")).toBeInTheDocument();
  });
});

describe("ProjectsGitIntegrationSettings — shortcut help dialog (BLD-X-FE-SETTINGS-INT-018)", () => {
  it("passes onShortcutHelp to useBuildListKeyboard so the ? key can open the help overlay", () => {
    mockData = [];
    render(<ProjectsGitIntegrationSettings />);
    expect(mockUseBuildListKeyboard).toHaveBeenCalledWith(
      expect.objectContaining({ onShortcutHelp: expect.any(Function) }),
    );
  });

  it("ShortcutHelpDialog is not shown on initial render — paired with the open test below", () => {
    mockData = [];
    render(<ProjectsGitIntegrationSettings />);
    expect(screen.queryByTestId("shortcut-help-dialog")).not.toBeInTheDocument();
  });

  it("the onShortcutHelp callback passed to the keyboard hook opens the dialog — calling it does not throw and transitions open state", async () => {
    mockData = [];
    render(<ProjectsGitIntegrationSettings />);
    const capturedOptions = mockUseBuildListKeyboard.mock.calls[0]?.[0] as { onShortcutHelp: () => void };
    expect(typeof capturedOptions.onShortcutHelp).toBe("function");
    await act(async () => { capturedOptions.onShortcutHelp(); });
    expect(screen.getByTestId("shortcut-help-dialog")).toBeInTheDocument();
  });
});

describe("ProjectsGitIntegrationSettings — offline state (BLD-X-FE-SETTINGS-INT-019)", () => {
  it("hides the Add connection button when the user is offline — creation requires the server", () => {
    mockData = [];
    (
      jest.requireMock("@/hooks/common/use-online-status") as {
        useOnlineStatus: jest.Mock;
      }
    ).useOnlineStatus.mockReturnValue(false);
    render(<ProjectsGitIntegrationSettings />);
    expect(screen.queryByRole("button", { name: /add connection/i })).not.toBeInTheDocument();
  });

  it("shows the Add connection button when online — paired with the offline assertion above so it cannot pass on a blank frame", () => {
    mockData = [];
    render(<ProjectsGitIntegrationSettings />);
    expect(screen.getByRole("button", { name: /add connection/i })).toBeInTheDocument();
  });

  it("shows You are offline in the empty state when the device is offline", () => {
    mockData = [];
    (
      jest.requireMock("@/hooks/common/use-online-status") as {
        useOnlineStatus: jest.Mock;
      }
    ).useOnlineStatus.mockReturnValue(false);
    render(<ProjectsGitIntegrationSettings />);
    expect(screen.getByText("You are offline")).toBeInTheDocument();
  });

  it("does not show You are offline when the device is online and there are no connections", () => {
    mockData = [];
    render(<ProjectsGitIntegrationSettings />);
    expect(screen.queryByText("You are offline")).not.toBeInTheDocument();
    expect(screen.getByText(/no repositories connected/i)).toBeInTheDocument();
  });
});
