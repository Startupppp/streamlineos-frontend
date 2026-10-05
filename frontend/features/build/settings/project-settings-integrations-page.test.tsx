import { render, screen } from "@testing-library/react";
import type { AccessState } from "@/lib/rbac/gate";
import { ProjectSettingsIntegrationsPage } from "./project-settings-integrations-page";

let mockAccessState: AccessState = "denied";
let mockIsError = false;
const mockUsePageState = jest.fn();

jest.mock("@/hooks/api/access", () => ({
  useCan: (_permission: string) => mockAccessState === "granted",
  useCanState: (_permission: string): AccessState => mockAccessState,
  usePermissionGate: (_permission: string) => ({ allowed: mockAccessState === "granted", state: mockAccessState }),
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: (opts: unknown) => {
    mockUsePageState(opts);
    if (mockAccessState === "denied") return { kind: "denied", permission: "integrations:git:view" };
    if (mockAccessState === "loading") return { kind: "loading" };
    if (mockIsError) return { kind: "error", error: new Error("fetch failed") };
    return { kind: "ready" };
  },
}));

jest.mock("@/features/build/settings/git-integration-settings", () => ({
  ProjectsGitIntegrationSettings: () => <div data-testid="git-integration-settings" />,
}));

jest.mock("@/features/build/settings/slack-integration-settings", () => ({
  SlackIntegrationSettings: () => <div data-testid="slack-integration-settings" />,
}));

jest.mock("@/features/build/settings/email-inbound-settings", () => ({
  EmailInboundSettings: () => <div data-testid="email-inbound-settings" />,
}));

jest.mock("@/features/build/shared/use-build-list-keyboard", () => ({
  useBuildListKeyboard: () => ({ focusedIndex: null, setFocusedIndex: jest.fn() }),
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
    resolution: { kind: string };
    children: React.ReactNode;
    loading?: React.ReactNode;
  }) => {
    if (resolution.kind === "denied") return <div data-testid="no-permission" />;
    if (resolution.kind === "loading") return <div data-testid="page-loading">{loading}</div>;
    if (resolution.kind === "error") return <div data-testid="page-error" />;
    return <div>{children}</div>;
  },
}));

beforeEach(() => {
  mockAccessState = "denied";
  mockIsError = false;
});

describe("ProjectSettingsIntegrationsPage — access control (BLD-X-FE-SETTINGS-INT-001)", () => {
  it("renders NoPermissionState when access is denied — PageState gates on integrations:git:view", () => {
    render(<ProjectSettingsIntegrationsPage projectId={1} />);
    expect(screen.getByTestId("no-permission")).toBeInTheDocument();
    expect(screen.queryByTestId("git-integration-settings")).not.toBeInTheDocument();
  });

  it("renders git integration settings when access is granted", () => {
    mockAccessState = "granted";
    render(<ProjectSettingsIntegrationsPage projectId={1} />);
    expect(screen.queryByTestId("no-permission")).not.toBeInTheDocument();
    expect(screen.getByTestId("git-integration-settings")).toBeInTheDocument();
  });

  it("fails closed on loading — git integration hidden while access is in flight", () => {
    mockAccessState = "loading";
    render(<ProjectSettingsIntegrationsPage projectId={1} />);
    expect(screen.queryByTestId("git-integration-settings")).not.toBeInTheDocument();
  });
});

describe("ProjectSettingsIntegrationsPage — error state (BLD-X-FE-SETTINGS-INT-002)", () => {
  it("renders error state when the page fetch fails — not an empty settings panel", () => {
    mockAccessState = "granted";
    mockIsError = true;
    render(<ProjectSettingsIntegrationsPage projectId={1} />);
    expect(screen.getByTestId("page-error")).toBeInTheDocument();
    expect(screen.queryByTestId("git-integration-settings")).not.toBeInTheDocument();
  });

  it("the git integration settings panel is visible when the page load succeeds — confirming the error test has a positive control", () => {
    mockAccessState = "granted";
    render(<ProjectSettingsIntegrationsPage projectId={1} />);
    expect(screen.getByTestId("git-integration-settings")).toBeInTheDocument();
    expect(screen.queryByTestId("page-error")).not.toBeInTheDocument();
  });
});

describe("ProjectSettingsIntegrationsPage — permission key (Criterion 3)", () => {
  it("passes integrations:git:view to usePageState, the key its own GET endpoint requires", () => {
    mockAccessState = "granted";
    render(<ProjectSettingsIntegrationsPage projectId={1} />);
    expect(mockUsePageState).toHaveBeenCalledWith(
      expect.objectContaining({ permission: "integrations:git:view" }),
    );
  });
});
