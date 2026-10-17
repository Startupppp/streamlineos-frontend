import { fireEvent, render, screen } from "@testing-library/react";
import { FindExpertPage } from "./find-expert-page";

const mockUseFindExpert = jest.fn();

jest.mock("@/hooks/api/hr", () => ({
  useFindExpert: (params: unknown) => mockUseFindExpert(params),
  useHrDepartments: () => ({ data: [] }),
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: () => ({ kind: "ready" }),
}));

function skillsRequested(): string[] {
  return mockUseFindExpert.mock.calls.flatMap((call) => {
    const params: unknown = call[0];
    if (typeof params !== "object" || params === null) return [];
    const skill = Reflect.get(params, "skill");
    return typeof skill === "string" && skill.length > 0 ? [skill] : [];
  });
}

function findExpert(isFetching: boolean) {
  mockUseFindExpert.mockReturnValue({
    data: undefined,
    isLoading: isFetching,
    isFetching,
    isError: false,
    error: null,
    refetch: jest.fn(),
  });
}

function searchButton(): HTMLElement {
  return screen.getByRole("button", { name: /^search$/i });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("BUG-016 Find Expert search button", () => {
  it("enables Search once a skill is typed and nothing is in flight, so the negatives below are not passing on a control that is always disabled", () => {
    findExpert(false);
    render(<FindExpertPage />);
    fireEvent.change(screen.getByLabelText(/skill search/i), {
      target: { value: "React" },
    });

    expect(searchButton()).toBeEnabled();
  });

  it("stays disabled on an empty query, so an unfiltered expert sweep cannot be submitted", () => {
    findExpert(false);
    render(<FindExpertPage />);

    expect(searchButton()).toBeDisabled();
  });

  it("disables Search while the query is in flight, so a double-click cannot queue a second identical search", () => {
    findExpert(true);
    render(<FindExpertPage />);
    fireEvent.change(screen.getByLabelText(/skill search/i), {
      target: { value: "React" },
    });

    expect(searchButton()).toBeDisabled();
    expect(searchButton()).toHaveAttribute("aria-busy", "true");
  });

  it("asks for exactly one skill when Search is clicked twice while the first request is still in flight", () => {
    findExpert(false);
    const { rerender } = render(<FindExpertPage />);
    fireEvent.change(screen.getByLabelText(/skill search/i), {
      target: { value: "React" },
    });
    fireEvent.click(searchButton());

    findExpert(true);
    rerender(<FindExpertPage />);
    fireEvent.click(searchButton());

    expect([...new Set(skillsRequested())]).toEqual(["React"]);
  });

  it("guides the reader before any search rather than claiming no experts exist", () => {
    findExpert(false);
    render(<FindExpertPage />);

    expect(screen.getByText(/search for a skill/i)).toBeInTheDocument();
    expect(screen.queryByText(/no experts found/i)).toBeNull();
  });
});
