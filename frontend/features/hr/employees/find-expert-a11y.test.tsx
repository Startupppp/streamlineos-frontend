import { render } from "@testing-library/react";
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

/**
 * An automated axe pass over the Find Expert surface BUG-011 and BUG-016
 * touched. This is the machine-checkable share of accessibility only: axe sees
 * labels, roles and contrast in the tree, and cannot see focus order, focus
 * restoration after an overlay closes, or how a screen reader narrates a
 * pending search. Those still need a browser (FE-123).
 */
describe("Find Expert has no automatically detectable accessibility violations", () => {
  beforeEach(() => jest.clearAllMocks());

  it("in its pre-search empty state", async () => {
    findExpert({});
    const { container } = render(<FindExpertPage />);
    await expectNoAxeViolations(container);
  });

  it("while a search is in flight, with Search rendered busy", async () => {
    // The state BUG-016 added: a LoadingButton carrying aria-busy. A busy
    // control that axe cannot name is the failure this guards against.
    findExpert({ isFetching: true, isLoading: true });
    const { container } = render(<FindExpertPage />);
    await expectNoAxeViolations(container);
  });

  it("when the search read fails", async () => {
    findExpert({ isError: true, error: new Error("upstream unavailable") });
    const { container } = render(<FindExpertPage />);
    await expectNoAxeViolations(container);
  });
});
