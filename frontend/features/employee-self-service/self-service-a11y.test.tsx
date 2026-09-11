/**
 * PRD-C115 — responsive accessibility for the four self-service routes.
 *
 * Home's own grid is covered by `features/dashboard/home-a11y.test.tsx`. This
 * file is the other half of the criterion's surface: `/me/attendance`,
 * `/me/expenses`, `/me/time-off` and `/me/documents`, none of which carried an
 * axe assertion of any kind before it.
 *
 * Each route's page file is a two-line server component that awaits
 * `requireSession()` and renders one client root, so the client root IS the
 * page — rendering it here exercises the real component tree, its real states
 * and its real breakpoints.
 *
 * Every state is asserted at 375 / 768 / 1280 because the criterion says
 * *responsive* accessibility, and each error state carries a second assertion
 * axe cannot make: axe checks markup validity, not whether a failure is
 * ANNOUNCED. A silent red paragraph is valid markup and tells a screen-reader
 * user nothing, so the failed read must be reachable through `role="alert"`.
 */

import * as React from "react";
import { render, screen } from "@testing-library/react";
import { expectNoAxeViolations } from "@/test-utils/axe";
import { atViewport, VIEWPORTS, type ViewportName } from "@/test-utils/viewport";
import { TooltipProvider } from "@/components/ui/tooltip";

type PageState = "loading" | "loaded" | "empty" | "error";

const ERROR_MESSAGE = "this self-service read is down";

let state: PageState = "loaded";

/**
 * One stub satisfying every consumer shape on these pages — plain query,
 * infinite query and mutation — so a page's incidental hooks do not each need a
 * hand-written double and a newly added hook cannot silently render `undefined`
 * into the tree under test.
 */
function stub(data: unknown): Record<string, unknown> {
  const isLoading = state === "loading";
  const isError = state === "error";
  return {
    data: isLoading || isError ? undefined : data,
    isLoading,
    isPending: false,
    isError,
    error: isError ? new Error(ERROR_MESSAGE) : null,
    isSuccess: !isLoading && !isError,
    refetch: jest.fn(),
    mutate: jest.fn(),
    mutateAsync: jest.fn().mockResolvedValue(undefined),
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
  };
}

function rows<T>(loaded: T[]): T[] {
  return state === "empty" ? [] : loaded;
}

const DOCUMENT = {
  id: 1,
  documentTypeName: "Signed offer letter",
  status: "PENDING" as const,
  isMandatory: true,
  remarks: null,
  fileUrl: null,
  submittedAt: null,
};

const EXPENSE = {
  id: 1,
  category: "Meals",
  amount: 2400,
  currency: "INR",
  status: "PENDING",
  expenseDate: "2026-09-01",
  merchant: "Bistro",
  description: null,
  paymentMethod: "CASH",
  receiptUrl: null,
  createdAt: "2026-09-01T00:00:00.000Z",
  user: { id: "user_1", name: "Ada", email: "ada@example.com" },
};

const ATTENDANCE_STATUS = {
  status: "CHECKED_IN",
  checkInTime: "2026-09-01T09:00:00.000Z",
  checkOutTime: null,
  logs: [],
  dailyStats: { workHours: "7.5", breakHours: "0.5" },
  onBreak: false,
};

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), prefetch: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/me",
}));

jest.mock("next-auth/react", () => ({
  useSession: () => ({
    data: { user: { id: "user_1", name: "Ada" }, orgId: "org_1" },
    status: "authenticated",
  }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
  useAccess: () => ({ data: { isOrgOwner: false, scopes: {} }, isLoading: false }),
  useModuleEnabled: () => true,
}));

jest.mock("@/hooks/api/hr/documents", () => ({
  useMyOnboardingDocs: () => stub({ data: rows([DOCUMENT]) }),
  useUploadMyOnboardingDoc: () => stub(undefined),
}));

jest.mock("@/hooks/api/hr/expenses", () => ({
  useExpensePageData: () =>
    stub({
      expenses: rows([EXPENSE]),
      pagination: {
        page: 1,
        pageSize: 10,
        total: state === "empty" ? 0 : 1,
        totalPages: state === "empty" ? 0 : 1,
      },
      stats: null,
      isAdmin: false,
    }),
  useCreateExpense: () => stub(undefined),
  useUpdateExpense: () => stub(undefined),
  useDeleteExpense: () => stub(undefined),
}));

/**
 * The leaves surface pulls a long tail of incidental hooks out of this barrel
 * and the list grows. Enumerating the REAL module's exports and stubbing every
 * one it does not name explicitly keeps the corpus rendering when a new hook
 * lands, instead of failing as `(0, _hr.useX) is not a function` — which reads
 * like a broken page rather than a missing double.
 */
jest.mock("@/hooks/api/hr", () => {
  const named: Record<string, unknown> = {
  useHrAttendanceStatus: () => stub(ATTENDANCE_STATUS),
  useHrAttendanceHistory: () =>
    stub({
      data: rows([
        {
          id: 1,
          date: "2026-09-01",
          checkIn: "09:00",
          checkOut: "18:00",
          status: "PRESENT",
          workHours: "8",
          breakHours: "0.5",
        },
      ]),
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    }),
  useHrHolidaysForCalendar: () => stub(rows([])),
  useHrCheckIn: () => stub(undefined),
  useHrCheckOut: () => stub(undefined),
  useHrToggleBreak: () => stub(undefined),
  useHrPendingWfhRequests: () => stub(rows([])),
  useHrLeaveContext: () =>
    stub({
      balances: rows([
        { id: 1, leaveTypeName: "Annual", balance: "12", daysPerYear: 24 },
      ]),
      types: rows([{ id: 1, name: "Annual", requiresApproval: true }]),
      approvers: rows([{ id: "user_manager", name: "Grace" }]),
      joiningDate: "2025-01-06",
    }),
  useHrLeaveApprovals: () => stub({ pending: rows([]), all: rows([]) }),
  useHrMyLeaveRequestsInfinite: () =>
    stub({
      pages: [
        {
          data: rows([
            {
              id: 1,
              status: "PENDING",
              startDate: "2026-09-10",
              endDate: "2026-09-11",
              leaveTypeName: "Annual",
              reason: "Family commitment",
              totalDays: 2,
            },
          ]),
        },
      ],
    }),
  useHrLeavesThisWeek: () => stub(rows([])),
  useHrCreateLeave: () => stub(undefined),
  useHrCreateWfh: () => stub(undefined),
  useHrCancelLeave: () => stub(undefined),
  useHrEmployees: () => stub(rows([])),
  };
  const actual = jest.requireActual("@/hooks/api/hr") as Record<string, unknown>;
  const filled: Record<string, unknown> = {};
  for (const key of Object.keys(actual))
    filled[key] = named[key] ?? ((): unknown => stub(undefined));
  return { ...filled, ...named };
});

jest.mock("@/features/hr/expenses/components/create-expense-dialog", () => ({
  CreateExpenseDialog: () => null,
}));

jest.mock("@/features/hr/document-review/upload-doc-sheet", () => ({
  UploadDocSheet: () => null,
}));

jest.mock("@/features/hr/attendance/attendance-regularization-dialog", () => ({
  AttendanceRegularizationDialog: () => null,
}));

jest.mock("@/features/hr/attendance/attendance-email-dialog", () => ({
  AttendanceEmailDialog: () => null,
}));

jest.mock("@/features/hr/leaves/leave-request-sheet", () => ({
  LeaveRequestSheet: () => null,
}));

jest.mock("@/features/hr/leaves/wfh-request-sheet", () => ({
  WfhRequestSheet: () => null,
}));

import { MyAttendancePage } from "@/features/hr/attendance/my-attendance-page";
import { MyExpensesPage } from "@/features/hr/expenses/my-expenses-page";
import { MyDocumentsPage } from "@/features/hr/document-review/my-documents-page";
import { LeavesWfhContent } from "@/features/hr/leaves/components/leaves-wfh-content";

interface SelfServiceRoute {
  route: string;
  render: () => React.ReactElement;
  /** A string only this route renders, so the corpus cannot silently go blank. */
  marker: RegExp;
}

const ROUTES: readonly SelfServiceRoute[] = [
  {
    route: "/me/attendance",
    render: () => <MyAttendancePage />,
    marker: /attendance/i,
  },
  { route: "/me/expenses", render: () => <MyExpensesPage />, marker: /expense/i },
  {
    route: "/me/time-off",
    render: () => <LeavesWfhContent selfService />,
    marker: /leave|time off|wfh/i,
  },
  {
    route: "/me/documents",
    render: () => <MyDocumentsPage />,
    marker: /document/i,
  },
];

const STATES: readonly PageState[] = ["loading", "loaded", "empty", "error"];
const VIEWPORT_NAMES: readonly ViewportName[] = ["mobile", "tablet", "desktop"];

function renderRoute(entry: SelfServiceRoute) {
  return render(<TooltipProvider>{entry.render()}</TooltipProvider>);
}

describe("PRD-C115 — the self-service routes are accessible in every state, at every breakpoint", () => {
  let restoreViewport: (() => void) | undefined;

  afterEach(() => {
    restoreViewport?.();
    restoreViewport = undefined;
    state = "loaded";
  });

  for (const entry of ROUTES) {
    for (const viewport of VIEWPORT_NAMES) {
      for (const pageState of STATES) {
        it(`MEASURED: axe reports no violation for ${entry.route} in its ${pageState} state at ${viewport} (${VIEWPORTS[viewport]}px)`, async () => {
          restoreViewport = atViewport(viewport);
          state = pageState;
          const { baseElement } = renderRoute(entry);
          await expectNoAxeViolations(baseElement);
        });
      }
    }
  }

  it.each(ROUTES.map((r) => [r.route, r] as const))(
    "MEASURED: %s really renders its own content — this corpus is not a blank tree",
    (_route, entry) => {
      state = "loaded";
      renderRoute(entry);
      expect(screen.getAllByText(entry.marker).length).toBeGreaterThan(0);
    },
  );
});

describe("PRD-C115 — a failed self-service read is ANNOUNCED, not merely coloured red", () => {
  it.each(ROUTES.map((r) => [r.route, r] as const))(
    "MEASURED: %s puts its failure inside a live region a screen reader reaches",
    async (_route, entry) => {
      state = "error";
      renderRoute(entry);

      const announced = await screen.findAllByRole("alert");
      expect(announced.length).toBeGreaterThan(0);
      const spoken = announced.map((node) => node.textContent ?? "").join(" | ");
      expect(spoken).toContain(ERROR_MESSAGE);
    },
  );

  it.each(ROUTES.map((r) => [r.route, r] as const))(
    "MEASURED: %s offers a way out of the failure, not just a description of it",
    async (_route, entry) => {
      state = "error";
      renderRoute(entry);

      expect(
        (await screen.findAllByRole("button", { name: /try again|retry/i })).length,
      ).toBeGreaterThan(0);
    },
  );

  it.each(ROUTES.map((r) => [r.route, r] as const))(
    "MEASURED: %s does NOT dress an empty state up as a failure",
    (_route, entry) => {
      state = "empty";
      renderRoute(entry);

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    },
  );
});
