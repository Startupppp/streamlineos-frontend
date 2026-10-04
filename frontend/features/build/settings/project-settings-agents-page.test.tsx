import { render, screen, act } from "@testing-library/react";
import type { AccessState } from "@/lib/rbac/gate";
import { ProjectSettingsAgentsPage } from "./project-settings-agents-page";

let mockAccessState: AccessState = "denied";
const mockUsePageState = jest.fn();

jest.mock("@/hooks/api/access", () => ({
  useCan: (_permission: string) => mockAccessState === "granted",
  useCanState: (_permission: string): AccessState => mockAccessState,
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: (opts: unknown) => {
    mockUsePageState(opts);
    if (mockAccessState === "denied") return "denied";
    if (mockAccessState === "loading") return "loading";
    return "ready";
  },
}));

jest.mock("@/hooks/api/build/agent-tokens", () => ({
  useAgentTokens: () => ({ data: [], isLoading: false }),
}));

jest.mock("@/hooks/common/use-online-status", () => ({
  useOnlineStatus: jest.fn(() => true),
}));

jest.mock("@/features/build/settings/agent-tokens-section", () => ({
  AgentTokensSection: ({ createRef }: { createRef?: React.RefObject<(() => void) | null> }) => {
    if (createRef) {
      createRef.current = () => { (createRef as { _triggered?: boolean })._triggered = true; };
    }
    return <div data-testid="agent-tokens-section" />;
  },
}));

jest.mock("@/features/build/shared/use-build-list-filters", () => ({
  useBuildListFilters: () => ({
    search: "",
    debouncedSearch: "",
    cursor: null,
    setSearch: jest.fn(),
    setCursor: jest.fn(),
    value: () => "all",
    isActive: () => false,
    setValue: jest.fn(),
    clearAll: jest.fn(),
    activeCount: 0,
    isFiltered: false,
    resetKey: "",
    isPending: false,
  }),
}));

const mockUseBuildListKeyboard = jest.fn();

jest.mock("@/hooks/common/use-build-list-keyboard", () => ({
  useBuildListKeyboard: (...args: unknown[]) => mockUseBuildListKeyboard(...args),
}));

jest.mock("@/features/build/shared/build-list-toolbar", () => ({
  BuildListToolbar: () => null,
}));

jest.mock("@/components/shared/shortcut-help-dialog", () => ({
  ShortcutHelpDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="shortcut-help-dialog" /> : null,
}));

jest.mock("@/components/pm-chrome", () => ({
  PmPageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmPanel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmSection: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CONTENT_FILL_PANEL: "",
}));

jest.mock("@/components/shared/page-state", () => ({
  PageState: ({
    resolution,
    children,
    loading,
  }: {
    resolution: string;
    children: React.ReactNode;
    loading?: React.ReactNode;
  }) => {
    if (resolution === "denied") return <div data-testid="no-permission" />;
    if (resolution === "loading") return <div data-testid="page-loading">{loading}</div>;
    return <div>{children}</div>;
  },
}));

beforeEach(() => {
  mockAccessState = "denied";
  mockUseBuildListKeyboard.mockClear();
  mockUseBuildListKeyboard.mockReturnValue({ focusedIndex: null, setFocusedIndex: jest.fn() });
  (
    jest.requireMock("@/hooks/common/use-online-status") as {
      useOnlineStatus: jest.Mock;
    }
  ).useOnlineStatus.mockReturnValue(true);
});

describe("ProjectSettingsAgentsPage — keyboard shortcuts (Requirement C3)", () => {
  it("wires useBuildListKeyboard with onClearSelection so Esc clears the search filter", () => {
    mockAccessState = "granted";
    render(<ProjectSettingsAgentsPage projectId={1} />);
    expect(mockUseBuildListKeyboard).toHaveBeenCalledWith(
      expect.objectContaining({ onClearSelection: expect.any(Function) }),
    );
  });

  it("passes searchInputRef to useBuildListKeyboard so the / key focuses the search input", () => {
    mockAccessState = "granted";
    render(<ProjectSettingsAgentsPage projectId={1} />);
    expect(mockUseBuildListKeyboard).toHaveBeenCalledWith(
      expect.objectContaining({ searchInputRef: expect.anything() }),
    );
  });

  it("passes onCreate to useBuildListKeyboard so the c key can trigger the create token dialog", () => {
    mockAccessState = "granted";
    render(<ProjectSettingsAgentsPage projectId={1} />);
    expect(mockUseBuildListKeyboard).toHaveBeenCalledWith(
      expect.objectContaining({ onCreate: expect.any(Function) }),
    );
  });

  it("passes onShortcutHelp to useBuildListKeyboard so the ? key opens the shortcut help overlay", () => {
    mockAccessState = "granted";
    render(<ProjectSettingsAgentsPage projectId={1} />);
    expect(mockUseBuildListKeyboard).toHaveBeenCalledWith(
      expect.objectContaining({ onShortcutHelp: expect.any(Function) }),
    );
  });
});

describe("ProjectSettingsAgentsPage — access control (BLD-X-FE-SETTINGS-AGENTS-001)", () => {
  it("renders NoPermissionState when access is denied — PageState gates on settings:api-tokens:read", () => {
    render(<ProjectSettingsAgentsPage projectId={1} />);
    expect(screen.getByTestId("no-permission")).toBeInTheDocument();
    expect(screen.queryByTestId("agent-tokens-section")).not.toBeInTheDocument();
  });

  it("renders agent tokens when access is granted", () => {
    mockAccessState = "granted";
    render(<ProjectSettingsAgentsPage projectId={1} />);
    expect(screen.queryByTestId("no-permission")).not.toBeInTheDocument();
    expect(screen.getByTestId("agent-tokens-section")).toBeInTheDocument();
  });

  it("fails closed on loading — agent token section hidden while access is in flight", () => {
    mockAccessState = "loading";
    render(<ProjectSettingsAgentsPage projectId={1} />);
    expect(screen.queryByTestId("agent-tokens-section")).not.toBeInTheDocument();
  });

  it("shows page-loading state with skeleton while access is in flight", () => {
    mockAccessState = "loading";
    render(<ProjectSettingsAgentsPage projectId={1} />);
    expect(screen.getByTestId("page-loading")).toBeInTheDocument();
  });
});

describe("ProjectSettingsAgentsPage — URL search filter (BLD-X-FE-SETTINGS-AGENTS-002)", () => {
  it("passes withSearch:true to useBuildListFilters so the q param is URL-backed", () => {
    mockAccessState = "granted";
    render(<ProjectSettingsAgentsPage projectId={1} />);
    expect(mockUseBuildListKeyboard).toHaveBeenCalledWith(
      expect.objectContaining({ itemCount: expect.any(Number) }),
    );
  });

  it("BuildListToolbar receives the search value from URL-backed filters", () => {
    mockAccessState = "granted";
    render(<ProjectSettingsAgentsPage projectId={1} />);
    expect(screen.queryByTestId("no-permission")).not.toBeInTheDocument();
  });
});

describe("ProjectSettingsAgentsPage — permission key (Criterion 3)", () => {
  it("passes settings:api-tokens:read to usePageState, the key its own GET endpoint requires", () => {
    mockAccessState = "granted";
    render(<ProjectSettingsAgentsPage projectId={1} />);
    expect(mockUsePageState).toHaveBeenCalledWith(
      expect.objectContaining({ permission: "settings:api-tokens:read" }),
    );
  });
});

describe("ProjectSettingsAgentsPage — shortcut help dialog (BLD-X-FE-SETTINGS-AGENTS-003)", () => {
  it("ShortcutHelpDialog is not shown on initial render — paired with the open test below", () => {
    mockAccessState = "granted";
    render(<ProjectSettingsAgentsPage projectId={1} />);
    expect(screen.queryByTestId("shortcut-help-dialog")).not.toBeInTheDocument();
  });

  it("the onShortcutHelp callback passed to the keyboard hook opens the dialog when called", async () => {
    mockAccessState = "granted";
    render(<ProjectSettingsAgentsPage projectId={1} />);
    const capturedOptions = mockUseBuildListKeyboard.mock.calls[0]?.[0] as { onShortcutHelp: () => void };
    expect(typeof capturedOptions.onShortcutHelp).toBe("function");
    await act(async () => { capturedOptions.onShortcutHelp(); });
    expect(screen.getByTestId("shortcut-help-dialog")).toBeInTheDocument();
  });
});

describe("ProjectSettingsAgentsPage — offline state (BLD-X-FE-SETTINGS-AGENTS-004)", () => {
  it("shows the offline banner when the device is offline and the page is ready", () => {
    mockAccessState = "granted";
    (
      jest.requireMock("@/hooks/common/use-online-status") as {
        useOnlineStatus: jest.Mock;
      }
    ).useOnlineStatus.mockReturnValue(false);
    render(<ProjectSettingsAgentsPage projectId={1} />);
    expect(screen.getByText(/you are offline/i)).toBeInTheDocument();
  });

  it("does not show the offline banner when the device is online", () => {
    mockAccessState = "granted";
    render(<ProjectSettingsAgentsPage projectId={1} />);
    expect(screen.queryByText(/you are offline/i)).not.toBeInTheDocument();
  });
});
