import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import type { EmployeeData } from "./employee-data";

const mockUseCan = jest.fn();
const mockUseScope = jest.fn();
const mockSessionUserId = { current: "viewer-1" };

jest.mock("@/hooks/common/use-hydrated", () => ({ useHydrated: () => true }));
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), refresh: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { id: mockSessionUserId.current } } }),
}));
jest.mock("next/dynamic", () => () => {
  function DynamicStub(props: { onArchived?: unknown; onRehired?: unknown }) {
    if (props.onArchived) return <div data-testid="archive-action" />;
    if (props.onRehired) return <div data-testid="rehire-dialog" />;
    return null;
  }
  return DynamicStub;
});
jest.mock("@/hooks/api/access", () => ({
  useCan: (key: string) => mockUseCan(key),
  useScope: (key: string) => mockUseScope(key),
}));
jest.mock("@/hooks/api/hr", () => ({
  useHrEmployeeStats: () => ({ data: undefined, isLoading: false }),
  useHrEmployeeProjects: () => ({ data: [] }),
  useHrEmployeeTickets: () => ({ data: { data: [] } }),
  useEmployeeEmployment: () => ({ data: undefined }),
  useExportEmployeePdf: () => ({ mutate: jest.fn(), isPending: false }),
}));
jest.mock("@/hooks/api/ai", () => ({
  useAIAttritionRisk: () => ({ mutateAsync: jest.fn() }),
  useAIGenerateReview: () => ({ mutateAsync: jest.fn() }),
}));
jest.mock("@/components/ai", () => ({ AiActionsMenu: () => <div data-testid="ai-menu" /> }));
jest.mock("@/features/hr/employees/detail/edit-employee-form", () => ({ EditEmployeeForm: () => null }));
jest.mock("@/components/hr/employee-attendance-history", () => ({ EmployeeAttendanceHistory: () => null }));
jest.mock("@/components/hr/self-edit-profile-form", () => ({ SelfEditProfileForm: () => null }));
jest.mock("@/components/hr/employee-tickets-list", () => ({ EmployeeTicketsList: () => null }));
jest.mock("@/features/hr/employees/detail/employee-header-card", () => ({ EmployeeHeaderCard: () => null }));
jest.mock("@/features/hr/employees/detail/overview-tab", () => ({ OverviewTab: () => null }));
jest.mock("@/components/ui/scroll-edge-fade", () => ({
  ScrollEdgeFade: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
jest.mock("@/features/hr/employees/detail/employee-tabs-list", () => ({
  EmployeeTabsList: ({ showSensitiveTab, showEditTab }: { showSensitiveTab: boolean; showEditTab: boolean }) => (
    <div data-testid="tabs" data-sensitive={String(showSensitiveTab)} data-edit={String(showEditTab)} />
  ),
}));
jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ actions, children }: { actions?: ReactNode; children?: ReactNode }) => (
    <div>
      <div data-testid="actions">{actions}</div>
      {children}
    </div>
  ),
}));

import { EmployeeDetailsView } from "./employee-details-view";

function employee(overrides: Partial<EmployeeData> = {}): EmployeeData {
  return {
    id: "user-2",
    name: "Ada Lovelace",
    firstName: "Ada",
    lastName: "Lovelace",
    email: "ada@example.test",
    role: "MEMBER",
    designation: null,
    employeeId: null,
    orgDepartmentId: null,
    image: null,
    isActive: true,
    hasAccepted: true,
    joiningDate: null,
    reportingTo: null,
    bio: null,
    linkedinUrl: null,
    twitterUrl: null,
    githubUrl: null,
    websiteUrl: null,
    skills: [],
    phone: null,
    employmentStatus: "ACTIVE",
    employment: null,
    inviteDelivery: {
      status: "none",
      queuedAt: null,
      sentAt: null,
      attempts: 0,
      lastError: null,
      deliveryConfirmed: false,
    },
    ...overrides,
  };
}

function grantEverything() {
  mockUseCan.mockReturnValue(true);
  mockUseScope.mockReturnValue("all");
}

describe("EmployeeDetailsView honours the server allowedActions", () => {
  beforeEach(() => {
    mockUseCan.mockReset();
    mockUseScope.mockReset();
    mockSessionUserId.current = "viewer-1";
  });

  it("shows every write control the server allows", () => {
    grantEverything();
    render(
      <EmployeeDetailsView
        employee={employee({
          allowedActions: ["view", "update", "export", "view_sensitive", "terminate", "archive"],
        })}
      />,
    );

    expect(screen.getByRole("button", { name: "Terminate employee" })).toBeInTheDocument();
    expect(screen.getByTestId("archive-action")).toBeInTheDocument();
    expect(screen.getByText("Export PDF")).toBeInTheDocument();
    expect(screen.getByTestId("tabs")).toHaveAttribute("data-edit", "true");
    expect(screen.getByTestId("tabs")).toHaveAttribute("data-sensitive", "true");
  });

  it("hides edit, terminate, archive, export and sensitive when the server allows only view, even if every client permission is granted", () => {
    grantEverything();
    render(<EmployeeDetailsView employee={employee({ allowedActions: ["view"] })} />);

    expect(screen.queryByRole("button", { name: "Terminate employee" })).not.toBeInTheDocument();
    expect(screen.queryByTestId("archive-action")).not.toBeInTheDocument();
    expect(screen.queryByText("Export PDF")).not.toBeInTheDocument();
    expect(screen.getByTestId("tabs")).toHaveAttribute("data-edit", "false");
    expect(screen.getByTestId("tabs")).toHaveAttribute("data-sensitive", "false");
  });

  it("offers rehire only when the server lists it", () => {
    grantEverything();
    const exited = { isActive: false, employmentStatus: "EXITED" };
    const { unmount } = render(
      <EmployeeDetailsView employee={employee({ ...exited, allowedActions: ["view", "rehire"] })} />,
    );
    expect(screen.getByRole("button", { name: "Rehire employee" })).toBeInTheDocument();
    unmount();

    render(<EmployeeDetailsView employee={employee({ ...exited, allowedActions: ["view"] })} />);
    expect(screen.queryByRole("button", { name: "Rehire employee" })).not.toBeInTheDocument();
  });

  it("falls back to useCan when the response carries no allowedActions", () => {
    grantEverything();
    const { unmount } = render(<EmployeeDetailsView employee={employee()} />);
    expect(screen.getByRole("button", { name: "Terminate employee" })).toBeInTheDocument();
    expect(screen.getByTestId("tabs")).toHaveAttribute("data-edit", "true");
    unmount();

    mockUseCan.mockReturnValue(false);
    mockUseScope.mockReturnValue("none");
    render(<EmployeeDetailsView employee={employee()} />);
    expect(screen.queryByRole("button", { name: "Terminate employee" })).not.toBeInTheDocument();
    expect(screen.getByTestId("tabs")).toHaveAttribute("data-edit", "false");
  });
});
