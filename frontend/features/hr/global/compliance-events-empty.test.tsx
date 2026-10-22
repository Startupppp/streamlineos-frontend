import { render, screen } from "@testing-library/react";
import { useComplianceEvents } from "@/hooks/api/hr/global";
import { ComplianceEventsTab } from "./compliance-events-tab";


jest.mock("@/hooks/api/hr/global", () => ({
  useComplianceEvents: jest.fn(),
  useMarkEventDone: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: (options: { isLoading: boolean; isError: boolean; error?: unknown }) =>
    jest.requireActual("@/lib/page-state/resolve-page-state").resolvePageState({
      ...options,
      access: "granted",
    }),
}));

const mockedEvents = useComplianceEvents as jest.Mock;

function withEvents(data: unknown[]) {
  mockedEvents.mockReturnValue({
    data: { data },
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  });
}

describe("ComplianceEventsTab empty state", () => {
  it("says an empty calendar means nothing is tracked, not that the org is compliant", () => {
    withEvents([]);
    render(<ComplianceEventsTab />);

    expect(screen.getByText("No compliance deadlines scheduled")).toBeInTheDocument();
    expect(screen.getByText(/not that you are compliant/)).toBeInTheDocument();
  });

  it("lists real deadlines when there are some, with no empty-state copy", () => {
    withEvents([
      {
        id: 1,
        requirementId: 7,
        requirementName: "PF monthly return",
        dueDate: "2031-10-15",
        category: "statutory_filing",
        status: "pending",
      },
    ]);
    render(<ComplianceEventsTab />);

    expect(screen.getByText("PF monthly return")).toBeInTheDocument();
    expect(screen.queryByText(/not that you are compliant/)).not.toBeInTheDocument();
  });
});
