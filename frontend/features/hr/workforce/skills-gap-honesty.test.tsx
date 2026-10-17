import { fireEvent, render, screen } from "@testing-library/react";
import { ApiError } from "@/lib/api-envelope";
import { permissionGate } from "@/lib/rbac/permission-gate";
import type { PageStateResolution } from "@/lib/page-state/resolve-page-state";
import { WorkforcePlanningPage } from "./workforce-planning-page";

const skillsGap = jest.fn();
const pageState = jest.fn<PageStateResolution, []>();
const emptyRead = () => ({
  data: undefined,
  isLoading: false,
  isError: false,
  error: null,
  refetch: jest.fn(),
});

jest.mock("@/hooks/api/hr/workforce", () => ({
  useHrSkillsGap: () => skillsGap(),
  useHrBudgetVsActual: () => emptyRead(),
  useHrWorkforcePlans: () => emptyRead(),
  useHrSuccessionRisk: () => emptyRead(),
  useHrAttritionForecast: () => emptyRead(),
  useCreateHeadcountPlan: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useUpdateHeadcountPlan: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: () => pageState(),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => false,
}));

const GRANTED = permissionGate("hr:analytics:read", true, true);
const DENIED = permissionGate("hr:analytics:read", false, true);
const PENDING = permissionGate("hr:analytics:read", false, false);
const UNAVAILABLE = permissionGate("hr:analytics:read", false, false, true);

const OK = { isLoading: false, isError: false, error: null };

function openSkillsGap() {
  render(<WorkforcePlanningPage />);
  fireEvent.mouseDown(screen.getByRole("tab", { name: /skills gap/i }), { button: 0, ctrlKey: false });
}

beforeEach(() => {
  jest.clearAllMocks();
  pageState.mockReturnValue({ kind: "ready" });
  skillsGap.mockReturnValue({
    ...OK,
    data: { gaps: [] },
    refetch: jest.fn(),
    access: GRANTED,
  });
});

describe("the skills gap tab never claims there is no gap when it could not read one", () => {
  it("says the read is refused, with no retry, when hr:analytics:read is missing", () => {
    skillsGap.mockReturnValue({
      ...OK,
      data: undefined,
      refetch: jest.fn(),
      access: DENIED,
    });
    openSkillsGap();

    expect(screen.getByText(/access restricted/i)).toBeInTheDocument();
    expect(screen.queryByText(/no skills gap data available/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /try again/i })).toBeNull();
  });

  it("reports the failure rather than an absent gap when the read 500d", () => {
    const refetch = jest.fn();
    skillsGap.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new ApiError("Internal server error", 500, undefined, {
        correlationId: "req-lane-d",
      }),
      refetch,
      access: GRANTED,
    });
    openSkillsGap();

    expect(screen.getByRole("alert")).toHaveTextContent(/couldn't load skills gap data/i);
    expect(screen.queryByText(/no skills gap data available/i)).toBeNull();
    expect(screen.getByText("req-lane-d")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("reports a failure, not an absent gap, when the access snapshot itself could not be read", () => {
    skillsGap.mockReturnValue({
      ...OK,
      data: undefined,
      refetch: jest.fn(),
      access: UNAVAILABLE,
    });
    openSkillsGap();

    expect(screen.getByRole("alert")).toHaveTextContent(/couldn't load skills gap data/i);
    expect(screen.queryByText(/no skills gap data available/i)).toBeNull();
  });

  it("shows neither an empty state nor a refusal while the permission is still pending", () => {
    skillsGap.mockReturnValue({
      ...OK,
      data: undefined,
      refetch: jest.fn(),
      access: PENDING,
    });
    openSkillsGap();

    expect(screen.queryByText(/no skills gap data available/i)).toBeNull();
    expect(screen.queryByText(/access restricted/i)).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("says the gap could not be determined when the read never ran and never failed", () => {
    skillsGap.mockReturnValue({
      ...OK,
      data: undefined,
      refetch: jest.fn(),
      access: GRANTED,
    });
    openSkillsGap();

    expect(screen.getByText(/could not be determined/i)).toBeInTheDocument();
    expect(screen.queryByText(/no skills gap data available/i)).toBeNull();
  });

  it("still shows the honest empty state when the read genuinely returned no gaps", () => {
    openSkillsGap();

    expect(screen.getByText(/no skills gap data available/i)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("still prints a genuine zero gap when the read returned one", () => {
    skillsGap.mockReturnValue({
      ...OK,
      data: { gaps: [{ skillName: "Kubernetes", required: 4, covered: 4, gap: 0 }] },
      refetch: jest.fn(),
      access: GRANTED,
    });
    openSkillsGap();

    expect(screen.getByText("Kubernetes")).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
