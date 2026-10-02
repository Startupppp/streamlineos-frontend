import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiError } from "@/lib/api-envelope";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import { CalibrationTab } from "./calibration-tab";
import { NineBoxGrid } from "./nine-box-grid";

const CALIBRATION_HOOKS = join(process.cwd(), "hooks/api/hr/calibration.ts");

const cycles = jest.fn();
const nineBox = jest.fn();
const entries = jest.fn();

jest.mock("@/hooks/api/hr", () => ({
  useReviewCycles: () => cycles(),
}));

jest.mock("@/hooks/api/hr/calibration", () => ({
  useNineBox: () => nineBox(),
  useCalibrationEntries: () => entries(),
  useUpsertCalibrationEntry: () => ({
    mutate: jest.fn(),
    isPending: false,
    variables: undefined,
  }),
}));

jest.mock("@/hooks/api/organization", () => ({
  useOrgMembers: () => ({ data: undefined }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => false,
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: () => ({ kind: "ready" }),
}));

beforeAll(() => {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = () => undefined;
  Element.prototype.releasePointerCapture = () => undefined;
  Element.prototype.scrollIntoView = () => undefined;
});

const OK = { isLoading: false, isError: false, error: null };
const CYCLE_ROWS = [{ id: 7, name: "H2 2026" }];

function failing(refetch: jest.Mock) {
  return {
    data: undefined,
    isLoading: false,
    isError: true,
    error: new ApiError("Internal server error", 500, undefined, {
      correlationId: "req-lane3",
    }),
    refetch,
  };
}

async function selectTheCycle() {
  await userEvent.click(screen.getByRole("combobox"));
  await userEvent.click(await screen.findByRole("option", { name: "H2 2026" }));
}

beforeEach(() => {
  jest.clearAllMocks();
  cycles.mockReturnValue({ ...OK, data: CYCLE_ROWS, refetch: jest.fn() });
  nineBox.mockReturnValue({ ...OK, data: [], refetch: jest.fn() });
  entries.mockReturnValue({ ...OK, data: [], refetch: jest.fn() });
});

describe("HRMS-B3-003 the 9-box grid does not report an empty grid for a failed read", () => {
  it("opts both calibration reads out of the /hr boundary, so their inline branches are reachable at all", () => {
    const source = readFileSync(CALIBRATION_HOOKS, "utf8");

    expect(INLINE_READ_ERROR).toEqual({ throwOnError: false });
    expect(source.match(/\.\.\.INLINE_READ_ERROR,/g) ?? []).toHaveLength(2);
  });

  it("shows nine labelled boxes on a healthy read, so the failure cases below are not passing on a grid that never mounts", async () => {
    nineBox.mockReturnValue({
      ...OK,
      data: [{ employeeId: "u-1", box: "3-3" }],
      refetch: jest.fn(),
    });
    render(<NineBoxGrid />);
    await selectTheCycle();

    expect(screen.getByText("Star")).toBeInTheDocument();
    expect(screen.getByText("Under Performer")).toBeInTheDocument();
  });

  it("renders an alert with a copyable reference instead of nine empty boxes when the 9-box read 500s", async () => {
    const refetch = jest.fn();
    nineBox.mockReturnValue(failing(refetch));
    render(<NineBoxGrid />);
    await selectTheCycle();

    expect(screen.getByRole("alert")).toHaveTextContent(/couldn't load 9-box data/i);
    expect(screen.getByText("req-lane3")).toBeInTheDocument();
    expect(screen.queryByText("Star")).toBeNull();
    expect(screen.queryByText(/no 9-box data yet/i)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("does not claim the grid is empty when the cycle list itself failed", () => {
    const refetch = jest.fn();
    cycles.mockReturnValue(failing(refetch));
    render(<NineBoxGrid />);

    expect(screen.getByRole("alert")).toHaveTextContent(/couldn't load review cycles/i);
    expect(screen.queryByText(/no 9-box data yet/i)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("still prompts for a cycle when nothing is selected and no read has failed", () => {
    render(<NineBoxGrid />);

    expect(screen.getByText(/no 9-box data yet/i)).toBeInTheDocument();
  });
});

describe("HRMS-B2-006 calibration does not report no entries for a failed read", () => {
  it("renders an alert with retry rather than the empty state when the entries read 500s", async () => {
    const refetch = jest.fn();
    entries.mockReturnValue(failing(refetch));
    render(<CalibrationTab />);
    await selectTheCycle();

    expect(screen.getByRole("alert")).toHaveTextContent(
      /couldn't load calibration entries/i,
    );
    expect(screen.queryByText(/no calibration entries yet/i)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("still shows the honest empty state when the cycle genuinely has no entries", async () => {
    render(<CalibrationTab />);
    await selectTheCycle();

    expect(screen.getByText(/no calibration entries yet/i)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
