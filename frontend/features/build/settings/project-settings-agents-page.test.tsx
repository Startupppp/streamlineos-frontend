import { render, screen } from "@testing-library/react";
import type { AccessState } from "@/lib/rbac/gate";
import { ProjectSettingsAgentsPage } from "./project-settings-agents-page";

let mockAccessState: AccessState = "denied";

jest.mock("@/hooks/api/access", () => ({
  useCan: (_permission: string) => mockAccessState === "granted",
  useCanState: (_permission: string): AccessState => mockAccessState,
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: () => {
    if (mockAccessState === "denied") return "denied";
    if (mockAccessState === "loading") return "loading";
    return "ready";
  },
}));

jest.mock("@/features/build/settings/agent-tokens-section", () => ({
  AgentTokensSection: () => <div data-testid="agent-tokens-section" />,
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

jest.mock("@/features/build/shared/use-build-list-keyboard", () => ({
  useBuildListKeyboard: () => ({ focusedIndex: null, setFocusedIndex: jest.fn() }),
}));

jest.mock("@/features/build/shared/build-list-toolbar", () => ({
  BuildListToolbar: () => null,
}));

jest.mock("@/components/pm-chrome", () => ({
  PmPageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmPanel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmSection: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PM_FILL_PANEL: "",
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
});

describe("ProjectSettingsAgentsPage — access control (BLD-X-FE-SETTINGS-AGENTS-001)", () => {
  it("renders NoPermissionState when access is denied — PageState gates on build:update", () => {
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
});
