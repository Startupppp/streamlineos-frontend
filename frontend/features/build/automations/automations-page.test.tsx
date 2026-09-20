import { render, screen } from "@testing-library/react";
import type { AccessState } from "@/lib/rbac/gate";
import { AutomationsPage } from "./automations-page";

let mockAccessState: AccessState = "denied";

jest.mock("@/hooks/api/access", () => ({
  useCan: (_permission: string) => mockAccessState === "granted",
  useCanState: (_permission: string): AccessState => mockAccessState,
}));

jest.mock("@/hooks/api/build/automations", () => ({
  useAutomations: () => ({ data: [], isLoading: false, isError: false, refetch: jest.fn() }),
  useCreateAutomation: () => ({ mutate: jest.fn(), isPending: false }),
  useUpdateAutomation: () => ({ mutate: jest.fn(), isPending: false }),
  useDeleteAutomation: () => ({ mutate: jest.fn(), isPending: false }),
  TRIGGER_EVENTS: [],
  ACTION_TYPES: [],
}));

jest.mock("@/features/build/navigation/build-dirty-state-context", () => ({
  useRegisterBuildDirtyState: jest.fn(),
}));

jest.mock("@/components/pm-chrome", () => ({
  PmPageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmSection: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  PmStaggerList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PM_FILL_PANEL: "",
  PM_FILL_SECTION: "",
}));

jest.mock("@/components/illustrations", () => ({
  AutomationsIllustration: () => <div />,
}));

beforeEach(() => {
  mockAccessState = "denied";
});

describe("AutomationsPage — build:manage controls (BLD-X-FE-SETTINGS-001)", () => {
  it("hides the New Automation button when the viewer lacks build:manage — no gate existed before", () => {
    render(<AutomationsPage projectId={1} />);
    expect(screen.queryByRole("button", { name: /new automation/i })).not.toBeInTheDocument();
  });

  it("shows the New Automation button when the viewer holds build:manage", () => {
    mockAccessState = "granted";
    render(<AutomationsPage projectId={1} />);
    expect(screen.getByRole("button", { name: /new automation/i })).toBeInTheDocument();
  });

  it("hides the New Automation button while the access snapshot is in flight, because a mutation control that appears and then vanishes offers authority the caller may not hold", () => {
    mockAccessState = "loading";
    render(<AutomationsPage projectId={1} />);
    expect(screen.queryByRole("button", { name: /new automation/i })).not.toBeInTheDocument();
  });
});
