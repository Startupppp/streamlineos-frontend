import { render, screen, within } from "@testing-library/react";
import type {
  RepCallMetrics,
  RepCallMetricsResponse,
} from "@/types/crm/call-intelligence";
import { RepMetricsTable } from "./rep-metrics-table";

jest.mock("@/components/renderer/use-tenant-layout", () => ({
  useTenantLayout: <T,>(layout: T): T => layout,
}));


const trend = (values: (number | null)[]) =>
  values.map((value, index) => ({
    bucketStart: `2026-08-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`,
    bucketEnd: `2026-08-${String(index + 2).padStart(2, "0")}T00:00:00.000Z`,
    calls: value === null ? 0 : 2,
    medianTalkRatioBps: value,
    medianQuestionRateBps: value,
    nextStepCommittedBps: value,
  }));

const rep = (over: Partial<RepCallMetrics> = {}): RepCallMetrics => ({
  repUserId: "user-rep-a",
  repName: "Ana Reyes",
  callsAnalysed: 6,
  embargoed: 0,
  withoutSpeakerMetrics: 0,
  medianTalkRatioBps: 4_150,
  medianQuestionRateBps: 3_000,
  nextStepCommittedBps: 5_000,
  trend: trend([4000, 4200, 4100, 4150]),
  ...over,
});

const response = (
  rows: RepCallMetrics[],
  meta: Partial<RepCallMetricsResponse["meta"]> = {},
): RepCallMetricsResponse => ({
  data: rows,
  pagination: { page: 1, limit: 25, total: rows.length, totalPages: 1 },
  meta: {
    sinceDays: 30,
    since: "2026-08-10T00:00:00.000Z",
    bucket: "week",
    truncated: false,
    scope: "team",
    unattributed: 0,
    embargoed: 0,
    consentBlocked: 0,
    privateWindowHours: 24,
    ...meta,
  },
});

const table = () => within(screen.getByRole("table"));

describe("RepMetricsTable", () => {
  it("renders a rep's median metrics as percentages, not basis points", () => {
    render(
      <RepMetricsTable
        response={response([rep()])}
        isLoading={false}
        page={1}
        pageSize={25}
        onPageChange={jest.fn()}
      />,
    );

    expect(table().getByText("Ana Reyes")).toBeInTheDocument();
    expect(table().getByText("42%")).toBeInTheDocument();
    expect(table().getByText("50%")).toBeInTheDocument();
    expect(table().getByText("3.0")).toBeInTheDocument();
  });

  it("never renders a user id, even when the name is missing", () => {
    render(
      <RepMetricsTable
        response={response([rep({ repName: null })])}
        isLoading={false}
        page={1}
        pageSize={25}
        onPageChange={jest.fn()}
      />,
    );

    expect(table().getByText("Former member")).toBeInTheDocument();
    expect(screen.queryByText("user-rep-a")).not.toBeInTheDocument();
  });

  it("shows an unmeasurable metric as unknown rather than as zero", () => {
    render(
      <RepMetricsTable
        response={response([
          rep({ medianTalkRatioBps: null, medianQuestionRateBps: null, nextStepCommittedBps: null }),
        ])}
        isLoading={false}
        page={1}
        pageSize={25}
        onPageChange={jest.fn()}
      />,
    );

    expect(screen.queryByText("0%")).not.toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("tells a manager how much of a rep's period is still private", () => {
    render(
      <RepMetricsTable
        response={response([rep({ callsAnalysed: 6, embargoed: 2 })])}
        isLoading={false}
        page={1}
        pageSize={25}
        onPageChange={jest.fn()}
      />,
    );

    expect(table().getByText("Still private")).toBeInTheDocument();
    expect(table().getByText("2")).toBeInTheDocument();
  });

  it("offers no way to reorder, because a sorted talk ratio is a leaderboard", () => {
    render(
      <RepMetricsTable
        response={response([rep()])}
        isLoading={false}
        page={1}
        pageSize={25}
        onPageChange={jest.fn()}
      />,
    );

    const headers = screen.getAllByRole("columnheader");
    for (const header of headers)
      expect(header.querySelector("button")).toBeNull();
  });

  it("explains an empty own-scope table differently from an empty team one", () => {
    const own = render(
      <RepMetricsTable
        response={response([], { scope: "own" })}
        isLoading={false}
        page={1}
        pageSize={25}
        onPageChange={jest.fn()}
      />,
    );
    expect(screen.getByText(/None of your calls/)).toBeInTheDocument();
    own.unmount();

    render(
      <RepMetricsTable
        response={response([], { scope: "team" })}
        isLoading={false}
        page={1}
        pageSize={25}
        onPageChange={jest.fn()}
      />,
    );
    expect(screen.getByText(/No analysed call in this window has opened for you/)).toBeInTheDocument();
  });
});
