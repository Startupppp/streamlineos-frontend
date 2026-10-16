import { render, screen } from "@testing-library/react";
import { useProjectHoursReport } from "@/hooks/api/timesheets-core/reports";
import { ProjectHoursTab } from "./project-hours-tab";

jest.mock("@/hooks/api/access", () => ({ useCan: () => true }));
jest.mock("@/hooks/api/build/projects", () => ({
  useProjects: () => ({ data: { data: [{ id: 7, name: "Apollo" }] } }),
}));
jest.mock("@/hooks/api/timesheets-core/reports", () => ({ useProjectHoursReport: jest.fn() }));
jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: ({ isLoading }: { isLoading: boolean }) => ({ kind: isLoading ? "loading" : "ready" }),
}));
jest.mock("@/components/shared/page-state", () => ({
  PageState: ({ resolution, children }: { resolution: { kind: string }; children: React.ReactNode }) =>
    resolution.kind === "ready" ? <>{children}</> : <p>loading</p>,
}));

const report = useProjectHoursReport as jest.Mock;
const RANGE = { startDate: "2026-09-01", endDate: "2026-09-30" };

beforeEach(() => {
  report.mockReset();
  report.mockReturnValue({ data: undefined, isLoading: true, isError: false, error: null, refetch: jest.fn() });
});

describe("ProjectHoursTab", () => {
  it("asks for a project before reading the report", () => {
    render(<ProjectHoursTab params={RANGE} projectId={null} onProjectChange={jest.fn()} enabled />);

    expect(screen.getByText("Choose a project")).toBeInTheDocument();
    expect(report).not.toHaveBeenCalled();
  });

  it("reads the chosen project's range and shows the billable split", () => {
    report.mockReturnValue({
      data: { projectId: 7, ...RANGE, totalHours: 40, billableHours: 30, nonBillableHours: 10 },
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
    render(<ProjectHoursTab params={RANGE} projectId={7} onProjectChange={jest.fn()} enabled />);

    expect(report).toHaveBeenCalledWith({ projectId: 7, ...RANGE }, true);
    expect(screen.getByText("40.0")).toBeInTheDocument();
    expect(screen.getByText("30.0")).toBeInTheDocument();
  });

  it("says nothing was logged instead of showing zeroes", () => {
    report.mockReturnValue({
      data: { projectId: 7, ...RANGE, totalHours: 0, billableHours: 0, nonBillableHours: 0 },
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
    render(<ProjectHoursTab params={RANGE} projectId={7} onProjectChange={jest.fn()} enabled />);

    expect(screen.getByText("No hours logged")).toBeInTheDocument();
  });
});
