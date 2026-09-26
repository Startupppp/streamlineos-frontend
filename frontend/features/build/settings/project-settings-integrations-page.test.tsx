import { render, screen } from "@testing-library/react";
import type { AccessState } from "@/lib/rbac/gate";
import { ProjectSettingsIntegrationsPage } from "./project-settings-integrations-page";

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

jest.mock("@/features/build/settings/git-integration-settings", () => ({
  ProjectsGitIntegrationSettings: () => <div data-testid="git-integration-settings" />,
}));

jest.mock("@/features/build/shared/use-build-list-keyboard", () => ({
  useBuildListKeyboard: () => ({ focusedIndex: null, setFocusedIndex: jest.fn() }),
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

describe("ProjectSettingsIntegrationsPage — access control (BLD-X-FE-SETTINGS-INT-001)", () => {
  it("renders NoPermissionState when access is denied — PageState gates on build:update", () => {
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
