import { render, screen } from "@testing-library/react";
import type { AccessState } from "@/lib/rbac/gate";
import { ProjectSettingsAccessPage } from "./project-settings-access-page";

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

jest.mock("@/features/build/settings/project-member-roles-section", () => ({
  ProjectMemberRolesSection: () => (
    <div data-testid="project-member-roles-section" />
  ),
}));

jest.mock("@/features/build/settings/team-roster-section", () => ({
  TeamRosterSection: () => <div data-testid="team-roster-section" />,
}));

jest.mock("@/components/pm-chrome", () => ({
  PmPageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmPanel: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
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

describe("ProjectSettingsAccessPage — access control (BLD-X-FE-SETTINGS-ACCESS-001)", () => {
  it("renders NoPermissionState when access is denied — PageState gates on build:members:view", () => {
    render(<ProjectSettingsAccessPage projectId={1} />);
    expect(screen.getByTestId("no-permission")).toBeInTheDocument();
    expect(screen.queryByTestId("project-member-roles-section")).not.toBeInTheDocument();
  });

  it("renders member sections when access is granted", () => {
    mockAccessState = "granted";
    render(<ProjectSettingsAccessPage projectId={1} />);
    expect(screen.queryByTestId("no-permission")).not.toBeInTheDocument();
    expect(screen.getByTestId("project-member-roles-section")).toBeInTheDocument();
    expect(screen.getByTestId("team-roster-section")).toBeInTheDocument();
  });

  it("does not leak existence of member data to denied viewers — no section heading visible", () => {
    render(<ProjectSettingsAccessPage projectId={1} />);
    expect(screen.queryByText(/member roles/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/teams/i)).not.toBeInTheDocument();
  });
});
