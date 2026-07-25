import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { HrWelcomeDialog } from "../hr-welcome-dialog";
import { useCan } from "@/hooks/api/access";
import {
  useModuleChecklist,
  useGuidedTours,
  useDismissTour,
  useDismissModuleChecklist,
} from "@/hooks/api/onboarding-flow";

jest.mock("@/hooks/api/access", () => ({ useCan: jest.fn() }));
jest.mock("@/hooks/api/onboarding-flow", () => ({
  useModuleChecklist: jest.fn(),
  useGuidedTours: jest.fn(),
  useDismissTour: jest.fn(),
  useDismissModuleChecklist: jest.fn(),
}));

const push = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

function checklist(overrides: Partial<{ status: string; items: { status: string }[]; dismissedAt: string | null }> = {}) {
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
  const dismissChecklist = { mutateAsync: jest.fn().mockResolvedValue({}), isPending: false };

  beforeEach(() => {
    jest.clearAllMocks();
    dismissTour.mutateAsync.mockResolvedValue({});
    dismissChecklist.mutateAsync.mockResolvedValue({});
    (useDismissTour as jest.Mock).mockReturnValue(dismissTour);
    (useDismissModuleChecklist as jest.Mock).mockReturnValue(dismissChecklist);
    // useCan is called twice: view then manage — default both true via mockImplementation
    (useCan as jest.Mock).mockReturnValue(true);
  });

  it("renders nothing for a user without hr:employees:view (employee exclusion)", () => {
    (useCan as jest.Mock).mockReturnValue(false);
    (useModuleChecklist as jest.Mock).mockReturnValue({ data: checklist() });
    (useGuidedTours as jest.Mock).mockReturnValue({ data: tours(null) });

    const { container } = render(<HrWelcomeDialog />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing once the checklist is already completed", () => {
    (useModuleChecklist as jest.Mock).mockReturnValue({ data: checklist({ status: "completed" }) });
    (useGuidedTours as jest.Mock).mockReturnValue({ data: tours(null) });

    const { container } = render(<HrWelcomeDialog />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing once the checklist was skipped/dismissed", () => {
    (useModuleChecklist as jest.Mock).mockReturnValue({
      data: checklist({ dismissedAt: "2026-07-25T00:00:00.000Z" }),
    });
    (useGuidedTours as jest.Mock).mockReturnValue({ data: tours(null) });

    const { container } = render(<HrWelcomeDialog />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing once the user has already interacted with the tour (progress non-null)", () => {
    (useModuleChecklist as jest.Mock).mockReturnValue({ data: checklist() });
    (useGuidedTours as jest.Mock).mockReturnValue({ data: tours({ status: "dismissed" }) });

    const { container } = render(<HrWelcomeDialog />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the welcome dialog with '0 of N completed' framing for a qualifying HR user on first visit", () => {
    (useModuleChecklist as jest.Mock).mockReturnValue({ data: checklist() });
    (useGuidedTours as jest.Mock).mockReturnValue({ data: tours(null) });

    render(<HrWelcomeDialog />);
    expect(screen.getByText("Welcome to HRMS")).toBeInTheDocument();
    expect(screen.getByText("1 of 3 completed")).toBeInTheDocument();
  });

  it("Start setup navigates to /hr/setup with ?tour=1 (the destination page opens the animated walkthrough itself)", () => {
    (useModuleChecklist as jest.Mock).mockReturnValue({ data: checklist() });
    (useGuidedTours as jest.Mock).mockReturnValue({ data: tours(null) });

    render(<HrWelcomeDialog />);
    fireEvent.click(screen.getByRole("button", { name: /start setup/i }));

    expect(push).toHaveBeenCalledWith("/hr/setup?tour=1");
  });

  it("Remind me later dismisses the tour without navigating or dismissing the checklist", async () => {
    (useModuleChecklist as jest.Mock).mockReturnValue({ data: checklist() });
    (useGuidedTours as jest.Mock).mockReturnValue({ data: tours(null) });

    render(<HrWelcomeDialog />);
    fireEvent.click(screen.getByRole("button", { name: /remind me later/i }));

    await waitFor(() => {
      expect(dismissTour.mutateAsync).toHaveBeenCalledWith("hr_setup");
    });
    expect(dismissChecklist.mutateAsync).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it("Skip dismisses the checklist and tour so HR Setup leaves the sidebar", async () => {
    (useModuleChecklist as jest.Mock).mockReturnValue({ data: checklist() });
    (useGuidedTours as jest.Mock).mockReturnValue({ data: tours(null) });

    render(<HrWelcomeDialog />);
    fireEvent.click(screen.getByRole("button", { name: /skip/i }));

    await waitFor(() => {
      expect(dismissChecklist.mutateAsync).toHaveBeenCalledWith("HR");
      expect(dismissTour.mutateAsync).toHaveBeenCalledWith("hr_setup");
    });
  });
});
