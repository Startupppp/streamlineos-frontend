/**
 * @jest-environment node
 */
/**
 * The SSR half of a contracted route must reject drift the same way the client
 * half does.
 *
 * Why this file exists rather than another assertion in
 * `hydration-contract.test.ts`: that suite mocks `@/lib/server-fetch` wholesale,
 * so `parseApiResponse` never runs there and a contract on the prefetch seam is
 * invisible to it. This one mocks `fetch` instead, so the real envelope parser
 * executes and the contract is actually exercised.
 *
 * The drift each case feeds is not invented. It is the shape the frontend's own
 * hand-written type declared as legal, verified against the backend column that
 * decides the truth:
 *   payroll_runs.gross_total  decimal(15,2).default("0").notNull()  (runs.ts:30)
 *   payroll_runs.employee_count integer.default(0).notNull()        (runs.ts:34)
 * `types/payroll/runs.ts:122` declares `grossTotal: string | null`, and the
 * backend service annotates the same field `string | null` too — both are
 * over-permissive against a `notNull()` column. A prefetch typed from that
 * declaration accepts a null the column cannot produce, hydrates it into the
 * client cache, and the page renders it before the contracted client `queryFn`
 * ever runs.
 */
jest.mock("server-only", () => ({}));

jest.mock("@/lib/get-server-auth", () => ({
  getServerAuth: jest.fn(),
}));

import type { DehydratedState } from "@tanstack/react-query";
import { getServerAuth } from "@/lib/get-server-auth";

const ORG = "org-a";
const USER = "user-1";

/** One page of `GET /payroll/runs` exactly as `buildCursorPage` emits it. */
const PAYROLL_RUNS_PAGE = {
  data: [
    {
      id: 41,
      month: "2026-08",
      status: "APPROVED",
      runType: "REGULAR",
      entityId: null,
      statutoryRuleVersion: null,
      grossTotal: "4820000.00",
      netTotal: "4113400.00",
      employeeCount: 214,
      exceptionCount: 0,
      createdAt: "2026-08-31T18:30:00.000Z",
    },
  ],
  pagination: { limit: 20, hasMore: false, nextCursor: null },
};

/** One page of `GET /roles`. `memberCount` is a raw count(distinct …). */
const ROLES_PAGE = {
  data: [
    {
      id: 7,
      name: "HR Admin",
      slug: "hr-admin",
      rank: 30,
      orgId: ORG,
      version: 4,
      isSystem: false,
      moduleKey: "HR",
      createdBy: null,
      createdAt: "2026-01-04T09:00:00.000Z",
      updatedAt: "2026-08-02T09:00:00.000Z",
      description: null,
      permissionCount: 62,
      memberCount: 11,
    },
  ],
  pagination: { limit: 20, hasMore: false, nextCursor: null },
};

/** One page of `GET /directory/workers`. Hand-rolled page: `pageInfo`. */
const WORKERS_PAGE = {
  data: [
    {
      workerId: "w-1",
      organizationId: ORG,
      organizationPersonId: "p-1",
      workerNumber: "EMP-0001",
      status: "ACTIVE",
      isPayee: true,
      deletedAt: null,
      createdAt: "2026-01-04T09:00:00.000Z",
      updatedAt: "2026-08-02T09:00:00.000Z",
      firstName: "Asha",
      lastName: "Rao",
      displayName: null,
      workEmail: "asha@example.test",
      avatarUrl: null,
      userId: "u-9",
    },
  ],
  pageInfo: { limit: 50, hasMore: false, nextCursor: null },
};

interface Reported {
  readonly resource: unknown;
  readonly issues: unknown;
}

let reports: Reported[] = [];

function respondWith(body: unknown): void {
  global.fetch = jest.fn(async () =>
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { "content-type": "application/json" },
    }),
  ) as unknown as typeof fetch;
}

/**
 * Fresh module registry per call: `serverGet` is wrapped in React's `cache`, so
 * two prefetches of the same path in one registry could answer from the first
 * one's memo and never reach the second body.
 *
 * The reporter is installed INSIDE the isolated registry. `error-reporter` holds
 * its active reporter in module state, so a registration made outside is held by
 * a different copy of the module and the isolated seam reports into a noop.
 */
async function prefetch(
  factory: "payroll" | "roles" | "directory",
): Promise<DehydratedState> {
  let state: DehydratedState | undefined;
  await jest.isolateModulesAsync(async () => {
    await installReporter();
    if (factory === "payroll") {
      const mod = await import("./payroll");
      state = await mod.prefetchPayrollRuns();
    } else if (factory === "roles") {
      const mod = await import("./roles");
      state = await mod.prefetchRoles();
    } else {
      const mod = await import("./directory");
      state = await mod.prefetchWorkers();
    }
  });
  if (state === undefined) throw new Error("prefetch produced no state");
  return state;
}

async function installReporter(): Promise<void> {
  const [{ setErrorReporter }, { isContractViolation }] = await Promise.all([
    import("@/lib/observability/error-reporter"),
    import("@/lib/api-envelope"),
  ]);
  setErrorReporter({
    report: ({ error, extra }) => {
      if (!isContractViolation(error)) return;
      reports.push({ resource: extra?.resource, issues: extra?.issues });
    },
  });
}

beforeEach(() => {
  reports = [];
  (getServerAuth as jest.Mock).mockResolvedValue({
    backendJwt: "token",
    orgId: ORG,
    user: { id: USER },
  });
});

afterEach(() => {
  jest.clearAllMocks();
});

describe("the prefetch seam parses what it hydrates", () => {
  it("hydrates a payroll page the backend actually emits", async () => {
    respondWith(PAYROLL_RUNS_PAGE);

    const state = await prefetch("payroll");

    expect(state.queries).toHaveLength(1);
    expect(state.queries[0]?.state.data).toEqual(PAYROLL_RUNS_PAGE);
  });

  it("hydrates nothing when a notNull money column arrives null", async () => {
    respondWith({
      ...PAYROLL_RUNS_PAGE,
      data: [{ ...PAYROLL_RUNS_PAGE.data[0], grossTotal: null }],
    });

    const state = await prefetch("payroll");

    expect(state.queries).toHaveLength(0);
    expect(reports).toHaveLength(1);
    expect(reports[0]?.resource).toBe("/payroll/runs?limit=20");
    expect(reports[0]?.issues).toEqual([
      expect.objectContaining({ path: "data.0.grossTotal" }),
    ]);
  });

  it("hydrates nothing when a count the service Number()-wraps arrives as a string", async () => {
    respondWith({
      ...PAYROLL_RUNS_PAGE,
      data: [{ ...PAYROLL_RUNS_PAGE.data[0], employeeCount: "214" }],
    });

    const state = await prefetch("payroll");

    expect(state.queries).toHaveLength(0);
    expect(reports[0]?.issues).toEqual([
      expect.objectContaining({ path: "data.0.employeeCount" }),
    ]);
  });

  it("hydrates a roles page the backend actually emits", async () => {
    respondWith(ROLES_PAGE);

    const state = await prefetch("roles");

    expect(state.queries).toHaveLength(1);
    expect(state.queries[0]?.state.data).toEqual(ROLES_PAGE);
  });

  it("hydrates nothing when memberCount arrives unwrapped from the raw count", async () => {
    respondWith({
      ...ROLES_PAGE,
      data: [{ ...ROLES_PAGE.data[0], memberCount: "11" }],
    });

    const state = await prefetch("roles");

    expect(state.queries).toHaveLength(0);
    expect(reports[0]?.resource).toBe("/roles?limit=20");
    expect(reports[0]?.issues).toEqual([
      expect.objectContaining({ path: "data.0.memberCount" }),
    ]);
  });

  it("hydrates a workers page the backend actually emits", async () => {
    respondWith(WORKERS_PAGE);

    const state = await prefetch("directory");

    expect(state.queries).toHaveLength(1);
    expect(state.queries[0]?.state.data).toEqual(WORKERS_PAGE);
  });

  it("hydrates nothing when the hand-rolled page envelope is renamed", async () => {
    const { pageInfo, ...rest } = WORKERS_PAGE;
    respondWith({ ...rest, pagination: pageInfo });

    const state = await prefetch("directory");

    expect(state.queries).toHaveLength(0);
    expect(reports[0]?.issues).toEqual([
      expect.objectContaining({ path: "pageInfo" }),
    ]);
  });

  it("hydrates nothing when a PII row loses the id every consumer keys on", async () => {
    const { workerId: _workerId, ...worker } = WORKERS_PAGE.data[0]!;
    respondWith({ ...WORKERS_PAGE, data: [worker] });

    const state = await prefetch("directory");

    expect(state.queries).toHaveLength(0);
    expect(reports[0]?.issues).toEqual([
      expect.objectContaining({ path: "data.0.workerId" }),
    ]);
  });
});

describe("the defect this replaces", () => {
  it("the same drifted body is accepted whole when the seam carries no contract", async () => {
    const drifted = {
      ...PAYROLL_RUNS_PAGE,
      data: [{ ...PAYROLL_RUNS_PAGE.data[0], grossTotal: null }],
    };
    respondWith(drifted);

    let received: unknown;
    await jest.isolateModulesAsync(async () => {
      await installReporter();
      const { serverGet } = await import("@/lib/server-fetch");
      received = await serverGet("/payroll/runs?limit=20");
    });

    expect(received).toEqual(drifted);
    expect(reports).toHaveLength(0);
  });
});
