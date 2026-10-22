import { render, fireEvent, screen } from "@testing-library/react";
import { expectNoAxeViolations } from "@/test-utils/axe";
import { FindExpertPage } from "./find-expert-page";

const mockUseFindExpert = jest.fn();

jest.mock("@/hooks/api/hr", () => ({
  useFindExpert: (params: unknown) => mockUseFindExpert(params),
  useHrDepartments: () => ({ data: [] }),
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: () => ({ kind: "ready" }),
}));

function findExpert(over: Record<string, unknown>) {
  mockUseFindExpert.mockReturnValue({
    data: undefined,
    isLoading: false,
    isFetching: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
    ...over,
  });
}

const EXPERT_FIXTURE = [
  {
    userId: "u1",
    name: "Alex Kim",
    firstName: "Alex",
    lastName: "Kim",
    email: "alex@example.com",
    image: null,
    designation: "Senior Engineer",
    role: "ENGINEERING",
    matchedSkill: "React",
    matchedLevel: 4,
    skills: [{ name: "React", level: 4 }],
  },
];

describe("Find Expert has no automatically detectable accessibility violations", () => {
  beforeEach(() => jest.clearAllMocks());

  it("in its pre-search empty state", async () => {
    findExpert({});
    const { container } = render(<FindExpertPage />);
    await expectNoAxeViolations(container);
  });

  it("while a search is in flight, with Search rendered busy", async () => {
    findExpert({ isFetching: true, isLoading: true });
    const { container } = render(<FindExpertPage />);
    await expectNoAxeViolations(container);
  });

  it("when the search read fails", async () => {
    findExpert({ isError: true, error: new Error("upstream unavailable") });
    const { container } = render(<FindExpertPage />);
    await expectNoAxeViolations(container);
  });

  it("with expert results rendered — avatar images and result cards have no violations", async () => {
    findExpert({ data: EXPERT_FIXTURE });
    const { container } = render(<FindExpertPage />);
    const input = screen.getByRole("searchbox");
    fireEvent.change(input, { target: { value: "React" } });
    fireEvent.submit(input.closest("form")!);
    await expectNoAxeViolations(container);
  });
});
