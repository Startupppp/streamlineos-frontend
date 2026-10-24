import { render } from "@testing-library/react";
import {
  baseChannelResult,
  mockUseCanState,
  mockUseCan,
  mockUseChatOutboxDrain,
  mockUseCreateEntityChannel,
  mockUseEntityChannel,
  mockUsePageState,
  mockUseScope,
} from "@/features/chat/build-project-chat-page-test-harness";
import { EmployeeDetailsView } from "./employee-details-view";
import type { EmployeeData } from "./employee-data";

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

jest.mock("@/hooks/common/use-hydrated", () => ({
  useHydrated: () => true,
}));

jest.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: () => null }),
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), refresh: jest.fn() }),
}));

jest.mock("@/components/ui/scroll-edge-fade", () => ({
  ScrollEdgeFade: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("@/components/hr/employee-attendance-history", () => ({
  EmployeeAttendanceHistory: () => null,
}));

jest.mock("@/components/hr/self-edit-profile-form", () => ({
  SelfEditProfileForm: () => null,
}));

jest.mock("@/components/hr/employee-tickets-list", () => ({
  EmployeeTicketsList: () => null,
}));

jest.mock("@/components/ai", () => ({
  AiActionsMenu: () => null,
}));

jest.mock("./overview-tab", () => ({ OverviewTab: () => null }));
jest.mock("./timeline-tab", () => ({ EmployeeTimelineTab: () => null }));
jest.mock("./sensitive-tab", () => ({ EmployeeSensitiveTab: () => null }));
jest.mock("./archive-employee-action", () => ({ ArchiveEmployeeAction: () => null }));
jest.mock("./rehire-employee-dialog", () => ({ RehireEmployeeDialog: () => null }));
jest.mock("./edit-employee-form", () => ({ EditEmployeeForm: () => null }));

jest.mock("@/lib/person-display", () => ({
  getUserDisplayName: () => "Test Employee",
  getUserInitials: () => "TE",
}));

jest.mock("next/dynamic", () => () => () => null);

const EMPLOYEE_STUB = {
  id: "emp-42",
  firstName: "Test",
  lastName: "Employee",
  email: "test@example.com",
  isActive: true,
  role: "member",
  allowedActions: [],
} as unknown as EmployeeData;

beforeEach(() => {
  jest.clearAllMocks();
  mockUseCan.mockReturnValue(false);
  mockUseCanState.mockReturnValue("allowed");
  mockUseScope.mockReturnValue("none");
  mockUseEntityChannel.mockReturnValue(baseChannelResult());
  mockUseCreateEntityChannel.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockUsePageState.mockReturnValue({ kind: "loading" });
  mockUseChatOutboxDrain.mockReturnValue(undefined);
});

describe("EmployeeDetailsView — chat tab", () => {
  it("calls useEntityChannel with type 'employee' and the employee id", () => {
    render(<EmployeeDetailsView employee={EMPLOYEE_STUB} />);
    expect(mockUseEntityChannel).toHaveBeenCalledWith("employee", "emp-42");
  });

  it("calls useEntityChannel with the correct id for a different employee", () => {
    const other = { ...EMPLOYEE_STUB, id: "emp-99" } as unknown as EmployeeData;
    render(<EmployeeDetailsView employee={other} />);
    expect(mockUseEntityChannel).toHaveBeenCalledWith("employee", "emp-99");
  });

  it("does not call useEntityChannel when chat access is denied", () => {
    mockUseCanState.mockReturnValue("denied");
    render(<EmployeeDetailsView employee={EMPLOYEE_STUB} />);
    expect(mockUseEntityChannel).not.toHaveBeenCalled();
  });
});
