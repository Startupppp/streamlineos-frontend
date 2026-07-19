import { render, screen, fireEvent } from "@testing-library/react";
import { HrWelcomeDialog } from "../hr-welcome-dialog";
import { useCan } from "@/hooks/api/access";
import { useModuleChecklist, useGuidedTours, useDismissTour } from "@/hooks/api/onboarding-flow";

jest.mock("@/hooks/api/access", () => ({ useCan: jest.fn() }));
jest.mock("@/hooks/api/onboarding-flow", () => ({
  useModuleChecklist: jest.fn(),
  useGuidedTours: jest.fn(),
  useDismissTour: jest.fn(),
}));

const push = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

function checklist(overrides: Partial<{ status: string; items: { status: string }[] }> = {}) {
  return {
    id: 1,
    moduleKey: "HR",
    status: "in_progress",
    progress: 20,
    dismissedAt: null,
    completedAt: null,
    items: [{ status: "done" }, { status: "todo" }, { status: "todo" }],
    ...overrides,
  };
}

function tours(progress: unknown = null) {
  return [{ id: 1, tourKey: "hr_setup", moduleKey: "HR", steps: [], progress }];
}

describe("HrWelcomeDialog", () => {
  const dismissTour = { mutateAsync: jest.fn().mockResolvedValue({}), isPending: false };

  beforeEach(() => {
    jest.clearAllMocks();
    dismissTour.mutateAsync.mockResolvedValue({});
    (useDismissTour as jest.Mock).mockReturnValue(dismissTour);
  });

  it("renders nothing for a user without hr:employees:view (employee exclusion)", () => {
    (useCan as jest.Mock).mockReturnValue(false);
    (useModuleChecklist as jest.Mock).mockReturnValue({ data: checklist() });
    (useGuidedTours as jest.Mock).mockReturnValue({ data: tours(null) });

    const { container } = render(<HrWelcomeDialog />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing once the checklist is already completed", () => {
    (useCan as jest.Mock).mockReturnValue(true);
    (useModuleChecklist as jest.Mock).mockReturnValue({ data: checklist({ status: "completed" }) });
    (useGuidedTours as jest.Mock).mockReturnValue({ data: tours(null) });

    const { container } = render(<HrWelcomeDialog />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing once the user has already interacted with the tour (progress non-null)", () => {
    (useCan as jest.Mock).mockReturnValue(true);
    (useModuleChecklist as jest.Mock).mockReturnValue({ data: checklist() });
    (useGuidedTours as jest.Mock).mockReturnValue({ data: tours({ status: "dismissed" }) });

    const { container } = render(<HrWelcomeDialog />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the welcome dialog with '0 of N completed' framing for a qualifying HR user on first visit", () => {
    (useCan as jest.Mock).mockReturnValue(true);
    (useModuleChecklist as jest.Mock).mockReturnValue({ data: checklist() });
    (useGuidedTours as jest.Mock).mockReturnValue({ data: tours(null) });

    render(<HrWelcomeDialog />);
    expect(screen.getByText("Welcome to HRMS")).toBeInTheDocument();
    expect(screen.getByText("1 of 3 completed")).toBeInTheDocument();
  });

  it("Start setup navigates to /hr/setup with ?tour=1 (the destination page opens the animated walkthrough itself)", () => {
    (useCan as jest.Mock).mockReturnValue(true);
    (useModuleChecklist as jest.Mock).mockReturnValue({ data: checklist() });
    (useGuidedTours as jest.Mock).mockReturnValue({ data: tours(null) });

    render(<HrWelcomeDialog />);
    fireEvent.click(screen.getByRole("button", { name: "Start setup" }));

    expect(push).toHaveBeenCalledWith("/hr/setup?tour=1");
  });

  it("Remind me later dismisses the tour without navigating", async () => {
    (useCan as jest.Mock).mockReturnValue(true);
    (useModuleChecklist as jest.Mock).mockReturnValue({ data: checklist() });
    (useGuidedTours as jest.Mock).mockReturnValue({ data: tours(null) });

    render(<HrWelcomeDialog />);
    fireEvent.click(screen.getByRole("button", { name: "Remind me later" }));

    await Promise.resolve();
    expect(dismissTour.mutateAsync).toHaveBeenCalledWith("hr_setup");
    expect(push).not.toHaveBeenCalled();
  });

  it("Skip dismisses the tour the same way Remind me later does", async () => {
    (useCan as jest.Mock).mockReturnValue(true);
    (useModuleChecklist as jest.Mock).mockReturnValue({ data: checklist() });
    (useGuidedTours as jest.Mock).mockReturnValue({ data: tours(null) });

    render(<HrWelcomeDialog />);
    fireEvent.click(screen.getByRole("button", { name: "Skip" }));

    await Promise.resolve();
    expect(dismissTour.mutateAsync).toHaveBeenCalledWith("hr_setup");
  });
});
