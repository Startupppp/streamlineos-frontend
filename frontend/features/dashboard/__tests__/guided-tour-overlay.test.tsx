import React from "react";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders, expectNoAxeViolations, atViewport } from "@/test-utils";
import { GuidedTourOverlay } from "../guided-tour-overlay";
import type { GuidedTour } from "@/hooks/api/onboarding-flow";

jest.mock("@/hooks/api/onboarding-flow", () => ({
  useGuidedTours: jest.fn(),
  useSaveTourProgress: jest.fn(),
  useDismissTour: jest.fn(),
}));

jest.mock("@animateicons/react/lucide", () => ({
  XIcon: React.forwardRef(function XIconStub(_props: unknown, _ref: unknown) {
    return <svg aria-hidden="true" data-testid="x-icon" />;
  }),
}));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({ iconRef: { current: null }, hoverHandlers: {} }),
}));

jest.mock("framer-motion", () => {
  const actual = jest.requireActual("framer-motion") as typeof import("framer-motion");
  return {
    ...actual,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion: {
      div: React.forwardRef(function MotionDivStub(
        { children, ...rest }: React.HTMLAttributes<HTMLDivElement>,
        ref: React.ForwardedRef<HTMLDivElement>,
      ) {
        return <div ref={ref} {...rest}>{children}</div>;
      }),
    },
  };
});

const {
  useGuidedTours,
  useSaveTourProgress,
  useDismissTour,
} = jest.requireMock("@/hooks/api/onboarding-flow") as {
  useGuidedTours: jest.MockedFunction<() => { data: GuidedTour[] | undefined }>;
  useSaveTourProgress: jest.MockedFunction<() => { mutate: jest.Mock; isPending: boolean }>;
  useDismissTour: jest.MockedFunction<() => { mutate: jest.Mock }>;
};

const TOUR_STEPS: Record<string, unknown>[] = [
  { title: "Welcome", description: "Let us show you around." },
  { title: "Create a record", description: "Click Add to begin." },
];

const ACTIVE_TOUR: GuidedTour = {
  id: 1,
  tourKey: "crm-intro",
  moduleKey: "crm",
  steps: TOUR_STEPS,
  progress: { id: 1, status: "not_started", currentStep: 0, completedAt: null, dismissedAt: null },
};

beforeEach(() => {
  useGuidedTours.mockReturnValue({ data: undefined });
  useSaveTourProgress.mockReturnValue({ mutate: jest.fn(), isPending: false });
  useDismissTour.mockReturnValue({ mutate: jest.fn() });
});

afterEach(() => jest.clearAllMocks());

describe("GuidedTourOverlay", () => {
  it("renders nothing when there are no tours", () => {
    useGuidedTours.mockReturnValue({ data: [] });
    const { container } = renderWithProviders(<GuidedTourOverlay />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when data is undefined", () => {
    useGuidedTours.mockReturnValue({ data: undefined });
    const { container } = renderWithProviders(<GuidedTourOverlay />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the active tour panel for a not_started tour", async () => {
    useGuidedTours.mockReturnValue({ data: [ACTIVE_TOUR] });
    renderWithProviders(<GuidedTourOverlay />);
    await waitFor(() => {
      expect(screen.getByText("Welcome")).toBeInTheDocument();
    });
    expect(screen.getByText("Let us show you around.")).toBeInTheDocument();
    expect(screen.getByText("Step 1 of 2")).toBeInTheDocument();
  });

  it("shows Next button on first step", async () => {
    useGuidedTours.mockReturnValue({ data: [ACTIVE_TOUR] });
    renderWithProviders(<GuidedTourOverlay />);
    await waitFor(() => screen.getByText("Next"));
    expect(screen.getByText("Next")).toBeInTheDocument();
  });

  it("shows Finish button on last step", async () => {
    const lastStepTour: GuidedTour = {
      ...ACTIVE_TOUR,
      progress: { id: 1, status: "in_progress", currentStep: 1, completedAt: null, dismissedAt: null },
    };
    useGuidedTours.mockReturnValue({ data: [lastStepTour] });
    renderWithProviders(<GuidedTourOverlay />);
    await waitFor(() => screen.getByText("Finish"));
    expect(screen.getByText("Finish")).toBeInTheDocument();
  });

  it("calls saveTourProgress.mutate with next step when Next is clicked", async () => {
    const mutateMock = jest.fn();
    useSaveTourProgress.mockReturnValue({ mutate: mutateMock, isPending: false });
    useGuidedTours.mockReturnValue({ data: [ACTIVE_TOUR] });
    renderWithProviders(<GuidedTourOverlay />);
    await waitFor(() => screen.getByText("Next"));
    fireEvent.click(screen.getByText("Next"));
    expect(mutateMock).toHaveBeenCalledWith(
      { tourKey: "crm-intro", currentStep: 1 },
      expect.objectContaining({ onError: expect.any(Function) }),
    );
  });

  it("calls dismissTour.mutate when dismiss button is clicked", async () => {
    const dismissMutate = jest.fn();
    useDismissTour.mockReturnValue({ mutate: dismissMutate });
    useGuidedTours.mockReturnValue({ data: [ACTIVE_TOUR] });
    renderWithProviders(<GuidedTourOverlay />);
    await waitFor(() => screen.getByLabelText("Dismiss tour"));
    fireEvent.click(screen.getByLabelText("Dismiss tour"));
    expect(dismissMutate).toHaveBeenCalledWith("crm-intro", expect.objectContaining({ onError: expect.any(Function) }));
  });

  it("renders dialog with correct aria-label", async () => {
    useGuidedTours.mockReturnValue({ data: [ACTIVE_TOUR] });
    renderWithProviders(<GuidedTourOverlay />);
    await waitFor(() => screen.getByRole("dialog"));
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-label", expect.stringContaining("Welcome"));
  });

  it("has no axe violations", async () => {
    useGuidedTours.mockReturnValue({ data: [ACTIVE_TOUR] });
    const { container } = renderWithProviders(<GuidedTourOverlay />);
    await waitFor(() => screen.getByRole("dialog"));
    await expectNoAxeViolations(container);
  });

  it("renders at mobile viewport (375px)", async () => {
    const restore = atViewport("mobile");
    useGuidedTours.mockReturnValue({ data: [ACTIVE_TOUR] });
    renderWithProviders(<GuidedTourOverlay />);
    await waitFor(() => screen.getByText("Welcome"));
    expect(screen.getByText("Welcome")).toBeInTheDocument();
    restore();
  });

  it("skips dismissed tours and renders nothing", () => {
    const dismissedTour: GuidedTour = {
      ...ACTIVE_TOUR,
      progress: { id: 1, status: "dismissed", currentStep: 0, completedAt: null, dismissedAt: "2026-01-01" },
    };
    useGuidedTours.mockReturnValue({ data: [dismissedTour] });
    const { container } = renderWithProviders(<GuidedTourOverlay />);
    expect(container.firstChild).toBeNull();
  });
});
