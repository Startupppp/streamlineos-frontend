import { render, screen } from "@testing-library/react";
import type { AccessState } from "@/lib/rbac/gate";
import { ProjectSettingsCredentialsPage } from "./project-settings-credentials-page";

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

describe("ProjectSettingsCredentialsPage — access control (BLD-X-FE-SETTINGS-CREDENTIALS-001)", () => {
  it("renders NoPermissionState when access is denied — PageState gates on settings:api-tokens:read", () => {
    render(<ProjectSettingsCredentialsPage projectId={1} />);
    expect(screen.getByTestId("no-permission")).toBeInTheDocument();
    expect(screen.queryByTestId("agent-tokens-section")).not.toBeInTheDocument();
  });

  it("renders agent tokens section when access is granted — positive paired with denial test", () => {
    mockAccessState = "granted";
    render(<ProjectSettingsCredentialsPage projectId={1} />);
    expect(screen.queryByTestId("no-permission")).not.toBeInTheDocument();
    expect(screen.getByTestId("agent-tokens-section")).toBeInTheDocument();
  });

  it("fails closed on loading — agent token section hidden while access is in flight", () => {
    mockAccessState = "loading";
    render(<ProjectSettingsCredentialsPage projectId={1} />);
    expect(screen.queryByTestId("agent-tokens-section")).not.toBeInTheDocument();
    expect(screen.getByTestId("page-loading")).toBeInTheDocument();
  });

  it("renders skeleton inside loading state — skeleton visible during access check", () => {
    mockAccessState = "loading";
    render(<ProjectSettingsCredentialsPage projectId={1} />);
    const loadingContainer = screen.getByTestId("page-loading");
    expect(loadingContainer).toBeInTheDocument();
  });

  it("shows page title when ready", () => {
    mockAccessState = "granted";
    render(<ProjectSettingsCredentialsPage projectId={1} />);
    expect(screen.getByText(/credentials/i)).toBeInTheDocument();
  });
});
