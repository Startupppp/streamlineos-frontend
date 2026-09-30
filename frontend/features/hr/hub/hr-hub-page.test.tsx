import { render, screen } from "@testing-library/react";
import { EMPTY_HR_HUB_ACCESS, type HrHubAccess } from "@/hooks/api/hr/hub-types";
import { HrHubPage } from "./hr-hub-page";

let mockCapabilities: HrHubAccess = EMPTY_HR_HUB_ACCESS;

jest.mock("@/hooks/api/hr/hub", () => ({
  ...jest.requireActual("@/hooks/api/hr/hub"),
  useHrHubSnapshot: () => ({
    data: { generatedAt: "", today: "", capabilities: mockCapabilities, sections: {} },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
}));

let mockSetupEmpty = false;
let mockDismissed = false;

jest.mock("@/features/hr/setup", () => ({
  HrStartHereChecklist: () => null,
  useHrSetupSignals: () => ({}),
  hrSetupIsEmpty: () => mockSetupEmpty,
  useHrStartHereDismissed: () => mockDismissed,
}));

beforeEach(() => {
  mockSetupEmpty = false;
  mockDismissed = false;
});

describe("HR hub without recruitment", () => {
  it("treats hiring capabilities as no HR panel and never renders a recruitment section", () => {
    mockCapabilities = {
      ...EMPTY_HR_HUB_ACCESS,
      canInterviews: true,
      canOffers: true,
      canRequisitions: true,
      canRequisitionsManage: true,
    };
    render(<HrHubPage />);

    expect(screen.getByText("No HR panels available to you")).toBeInTheDocument();
    expect(screen.queryByText(/recruitment/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/interviews today/i)).not.toBeInTheDocument();
  });

  it("still counts an HR capability as a panel", () => {
    mockCapabilities = { ...EMPTY_HR_HUB_ACCESS, canInterviews: true, canLeaveCalendar: true };
    render(<HrHubPage />);

    expect(screen.queryByText("No HR panels available to you")).not.toBeInTheDocument();
    expect(screen.getByText("Today")).toBeInTheDocument();
  });
});

describe("HR hub on an org with nothing set up (BUG-HRMS-012)", () => {
  it("leaves the body to the Start here checklist while it is showing", () => {
    mockSetupEmpty = true;
    mockCapabilities = { ...EMPTY_HR_HUB_ACCESS, canLeaveCalendar: true };
    render(<HrHubPage />);

    expect(screen.queryByText("Today")).not.toBeInTheDocument();
  });

  it("brings the panels back once the checklist is dismissed, instead of a blank body", () => {
    mockSetupEmpty = true;
    mockDismissed = true;
    mockCapabilities = { ...EMPTY_HR_HUB_ACCESS, canLeaveCalendar: true };
    render(<HrHubPage />);

    expect(screen.getByText("Today")).toBeInTheDocument();
  });
});
