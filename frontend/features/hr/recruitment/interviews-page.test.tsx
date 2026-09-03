import { render, screen } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils/render";

/**
 * Root CLAUDE.md §8: one unified calendar, module events are toggleable
 * SOURCES on it and never a calendar page of their own. `/hr/recruitment/interviews`
 * rendered a second full month/week calendar off `useInterviews`, which also made
 * it the only feature->feature importer of `features/calendar/**` (root §9).
 *
 * These tests pin the replacement: a list, plus a link that routes the surface at
 * `/calendar` with `hr-interviews` — an already-registered aggregate source —
 * switched on.
 */

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), prefetch: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/hr/recruitment/interviews",
}));

jest.mock("@animateicons/react/lucide", () => ({
  PlusIcon: () => null,
}));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({ iconRef: { current: null }, hoverHandlers: {} }),
}));

jest.mock("@/features/hr/recruitment/interviews/interview-list", () => ({
  InterviewList: () => <div data-testid="interview-list" />,
}));

jest.mock("@/features/hr/recruitment/interviews/interview-form-sheet", () => ({
  InterviewFormSheet: () => null,
}));

const useInterviews = jest.fn();
const useInterviewStats = jest.fn();

jest.mock("@/hooks/api/hr", () => ({
  useInterviews: (...args: unknown[]) => useInterviews(...args),
  useInterviewStats: (...args: unknown[]) => useInterviewStats(...args),
}));

import { InterviewsPage } from "./interviews-page";

const INTERVIEW_ROWS = [
  {
    id: 1,
    scheduledAt: "2026-06-10T10:00:00.000Z",
    duration: 60,
    type: "VIDEO",
    result: null,
    candidate: { firstName: "Ada", lastName: "Lovelace" },
  },
];

beforeEach(() => {
  jest.clearAllMocks();
  useInterviews.mockReturnValue({
    data: INTERVIEW_ROWS,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  });
  useInterviewStats.mockReturnValue({
    data: { total: 1, pending: 1, passed: 0, failed: 0 },
  });
});

describe("InterviewsPage", () => {
  it("renders the interview list, not a calendar of its own", () => {
    renderWithProviders(<InterviewsPage />);

    expect(screen.getByTestId("interview-list")).toBeInTheDocument();
    expect(screen.queryByLabelText("Previous")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Next")).not.toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: /calendar view/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: /^month$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: /^week$/i })).not.toBeInTheDocument();
  });

  it("links the surface to the unified calendar with hr-interviews as the source", () => {
    renderWithProviders(<InterviewsPage />);

    const link = screen.getByRole("link", { name: /view in calendar/i });
    expect(link).toHaveAttribute("href", "/calendar?source=hr-interviews");
  });

  it("BITE: these queries would find a month/week calendar toolbar if one were rendered", () => {
    render(
      <div>
        <button type="button" aria-label="Previous" />
        <button type="button" aria-label="Next" />
      </div>,
    );

    expect(screen.getByLabelText("Previous")).toBeInTheDocument();
    expect(screen.getByLabelText("Next")).toBeInTheDocument();
  });

  it("still surfaces the recruitment side-links and the schedule action", () => {
    renderWithProviders(<InterviewsPage />);

    expect(screen.getByRole("link", { name: /performance/i })).toHaveAttribute(
      "href",
      "/hr/recruitment/interviewer-performance",
    );
    expect(screen.getByRole("button", { name: /schedule/i })).toBeInTheDocument();
  });

  it("keeps its own error state rather than delegating a failed load to the list", () => {
    useInterviews.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: jest.fn(),
    });

    renderWithProviders(<InterviewsPage />);

    expect(screen.getByText(/unable to load interviews/i)).toBeInTheDocument();
    expect(screen.queryByTestId("interview-list")).not.toBeInTheDocument();
  });
});
