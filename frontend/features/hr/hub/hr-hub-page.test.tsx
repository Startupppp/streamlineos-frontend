import { act, render, screen } from "@testing-library/react";
import { EMPTY_HR_HUB_ACCESS, type HrHubAccess } from "@/hooks/api/hr/hub-types";
import { HrHubPage } from "./hr-hub-page";

let mockCapabilities: HrHubAccess = EMPTY_HR_HUB_ACCESS;
let mockIsLoading = false;
let mockAwaitingSession = false;

jest.mock("@/hooks/api/hr/hub", () => ({
  ...jest.requireActual("@/hooks/api/hr/hub"),
  useHrHubSnapshot: () => ({
    data: mockIsLoading || mockAwaitingSession
      ? undefined
      : { generatedAt: "", today: "", capabilities: mockCapabilities, sections: {} },
    isLoading: mockIsLoading,
    isPending: mockIsLoading || mockAwaitingSession,
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
  mockIsLoading = false;
  mockAwaitingSession = false;
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

describe("HR hub loading state (BUG-HRMS-016)", () => {
  it("renders panel skeletons while the snapshot is loading instead of a blank body", () => {
    mockIsLoading = true;
    render(<HrHubPage />);

    expect(screen.queryByText("No HR panels available to you")).not.toBeInTheDocument();
    expect(screen.queryByText("Today")).not.toBeInTheDocument();
    expect(screen.queryByText("Needs you")).not.toBeInTheDocument();
  });

  it("keeps the skeletons while the snapshot read waits for the session, instead of claiming no panels", () => {
    mockAwaitingSession = true;
    mockCapabilities = { ...EMPTY_HR_HUB_ACCESS, canLeaveCalendar: true };
    const { container } = render(<HrHubPage />);

    expect(screen.queryByText("No HR panels available to you")).not.toBeInTheDocument();
    expect(container.querySelector(".animate-pulse")).not.toBeNull();
  });

  it("offers Still loading / Try again once the snapshot has been pending for 10s (UX-16)", () => {
    jest.useFakeTimers();
    try {
      mockIsLoading = true;
      render(<HrHubPage />);
      expect(screen.queryByText(/still loading the HR overview/i)).not.toBeInTheDocument();
      act(() => {
        jest.advanceTimersByTime(10_000);
      });
      expect(screen.getByText(/still loading the HR overview/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
    } finally {
      jest.useRealTimers();
    }
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
