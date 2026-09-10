import { render, screen, within } from "@testing-library/react";
import type {
  RepCallMetrics,
  RepCallMetricsResponse,
} from "@/types/crm/call-intelligence";
import { RepMetricsTable } from "./rep-metrics-table";

/**
 * The table renders through the engine now, and `useTenantLayout` reads the
 * signed-in tenant's arrangement — a session and a query client this test has no
 * business standing up. Stubbed to the stock description, which is what these
 * assertions are about: that `REP_CALL_METRICS_LAYOUT` as declared renders
 * percentages rather than basis points, names rather than ids, and no sortable
 * column at all. That the arrangement path leaves a description valid is
 * `lib/renderer/registry.test.ts`'s job, for every layout at once.
 */
jest.mock("@/features/renderer/use-tenant-layout", () => ({
  useTenantLayout: <T,>(layout: T): T => layout,
}));

/**
 * CRM-P2-05's table, tested for what it refuses to render.
 *
 * The interesting assertions are the negative ones. A raw user id in a coaching
 * table is a house-rule violation and a bad answer to "who is this row about";
 * a `0%` where the server sent null reports a rep as having said nothing, which
 * is the fabrication `transcript-metrics.ts` exists to prevent, arriving through
 * a formatter instead of through arithmetic.
 */

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

/**
 * The desktop table, which is where a positive assertion belongs.
 *
 * `RecordList` renders the table and the mobile card list from one description,
 * and both are in the DOM at once — the breakpoint classes decide which is
 * *visible*, and jsdom applies no stylesheet. A bare `getByText` therefore finds
 * a rep's name twice, so what a positive assertion means is "the table shows
 * this", and this scopes it. Negative assertions stay global on purpose: a user
 * id must not appear in either rendering.
 */
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
    // 4150 bps is 42% once rounded, and 41.5% is not a number a table column
    // should be jittering over.
    expect(table().getByText("42%")).toBeInTheDocument();
    expect(table().getByText("50%")).toBeInTheDocument();
    // 3000 bps of questions per turn is three per ten turns.
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

  it("offers no sortable column, because a sorted talk ratio is a leaderboard", () => {
    render(
      <RepMetricsTable
        response={response([rep()])}
        isLoading={false}
        page={1}
        pageSize={25}
        onPageChange={jest.fn()}
      />,
    );

    /**
     * `DataTable` renders a header as a button exactly when its column declares
     * `sortable`. No button in the header row means no column does, which is the
     * property this test exists to hold — one `sortable: true` added later turns
     * a coaching table into a league table with no other visible change.
     */
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
