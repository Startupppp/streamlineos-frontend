import { render, screen } from "@testing-library/react";
import { InterviewsPage } from "./interviews-page";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  usePathname: () => "/recruitment/interviews",
  useSearchParams: () => new URLSearchParams(""),
}));

jest.mock("@/hooks/api/hr", () => ({
  useInterviews: () => ({ isLoading: false, isError: false, refetch: jest.fn() }),
  useInterviewStats: () => ({ data: { total: 0, pending: 0, passed: 0, failed: 0 } }),
}));

jest.mock("@/features/recruitment/interviews/interview-list", () => ({
  InterviewList: () => null,
}));
jest.mock("@/features/recruitment/interviews/interview-form-sheet", () => ({
  InterviewFormSheet: () => null,
}));

const LINK_ACTIONS = [
  "View in calendar",
  "Performance",
  "SLA Report",
  "SLA Config",
] as const;

describe("interview header actions keep an accessible name when their label is hidden", () => {
  it.each(LINK_ACTIONS)("%s is announced", (label) => {
    render(<InterviewsPage />);

    const controls = screen.getAllByRole("link", { name: label });

    expect(
      controls.some((control) => control.getAttribute("aria-label") === label),
    ).toBe(true);
  });

  it("Schedule is announced", () => {
    render(<InterviewsPage />);

    const controls = screen.getAllByRole("button", { name: "Schedule" });

    expect(
      controls.some(
        (control) => control.getAttribute("aria-label") === "Schedule",
      ),
    ).toBe(true);
  });
});
