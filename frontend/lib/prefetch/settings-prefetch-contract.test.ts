/**
 * @jest-environment node
 */
/**
 * The settings prefetch seam must refuse a drifted body rather than hydrate it.
 * `settings-prefetch.test.ts` mocks `serverGet`, so the envelope parser never
 * runs there; this file mocks `fetch` so the real contract executes.
 */
jest.mock("server-only", () => ({}));

jest.mock("@/lib/get-server-auth", () => ({
  getServerAuth: jest.fn(),
}));

import type { DehydratedState } from "@tanstack/react-query";
import { getServerAuth } from "@/lib/get-server-auth";
import { readUsersListState } from "@/features/directory/users/users-list-state";
import { readAuditLogFilters } from "@/features/settings/audit-log/audit-log-constants";

const ORG = "org-contract";
const USER = "user-contract";
const NO_PARAMS = new URLSearchParams();

const ACCESS = {
  membershipId: 4711,
  isOrgOwner: true,
  canManageOrganizationMembership: true,
  modules: {},
  scopes: {},
  mfa: { enforced: false, satisfied: true },
};

const AUDIT_LOG_PAGE = {
  logs: [
    {
      id: 9,
      action: "role.created",
      userId: "u-1",
      userName: "Asha Rao",
      userEmail: "asha@example.test",
      userImage: null,
      targetId: "7",
      targetType: "role",
      metadata: null,
      ipAddress: "203.0.113.4",
      createdAt: "2026-09-01T09:00:00.000Z",
    },
  ],
  pagination: { limit: 15, hasMore: false, nextCursor: null },
};

const WEBHOOKS_PAGE = {
  data: [
    {
      id: 3,
      orgId: ORG,
      url: "https://example.test/hook",
      description: null,
      events: ["ticket.created"],
      isActive: true,
      createdBy: "u-1",
      createdAt: "2026-08-01T09:00:00.000Z",
      updatedAt: "2026-08-01T09:00:00.000Z",
    },
  ],
  pagination: { limit: 20, hasMore: false, nextCursor: null },
};

interface Reported {
  readonly resource: unknown;
  readonly issues: unknown;
}

let reports: Reported[] = [];

/** `/me/access` answers first so the prefetch gate opens; every other path gets `body`. */
function respondWith(body: unknown): void {
  global.fetch = jest.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    const payload = url.includes("/me/access") ? ACCESS : body;
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as unknown as typeof fetch;
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

async function prefetch(
  factory: "auditLog" | "webhooks" | "users",
): Promise<DehydratedState> {
  let state: DehydratedState | undefined;
  await jest.isolateModulesAsync(async () => {
    await installReporter();
    const mod = await import("./settings-admin");
    if (factory === "auditLog")
      state = await mod.prefetchSettingsAuditLog(readAuditLogFilters(NO_PARAMS));
    else if (factory === "webhooks")
      state = await mod.prefetchSettingsWebhooks({ cursor: undefined, limit: 20 });
    else state = await mod.prefetchSettingsUsers(readUsersListState(NO_PARAMS));
  });
  if (state === undefined) throw new Error("prefetch produced no state");
  return state;
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

describe("the settings prefetch seam parses what it hydrates", () => {
  it("hydrates an audit-log page the backend actually emits", async () => {
    respondWith(AUDIT_LOG_PAGE);

    const state = await prefetch("auditLog");

    expect(
      state.queries.find((entry) => entry.queryKey[1] === "auditLog")?.state.data,
    ).toEqual(AUDIT_LOG_PAGE);
  });

  it("hydrates nothing when an audit row loses the id every consumer keys on", async () => {
    const { id: _id, ...row } = AUDIT_LOG_PAGE.logs[0]!;
    respondWith({ ...AUDIT_LOG_PAGE, logs: [row] });

    const state = await prefetch("auditLog");

    expect(
      state.queries.some((entry) => entry.queryKey[2] === "list"),
    ).toBe(false);
    expect(reports[0]?.issues).toEqual([
      expect.objectContaining({ path: "logs.0.id" }),
    ]);
  });

  it("hydrates a webhooks page the backend actually emits", async () => {
    respondWith(WEBHOOKS_PAGE);

    const state = await prefetch("webhooks");

    expect(state.queries).toHaveLength(1);
    expect(state.queries[0]?.state.data).toEqual(WEBHOOKS_PAGE);
  });

  it("hydrates nothing when the cursor envelope is renamed", async () => {
    const { pagination, ...rest } = WEBHOOKS_PAGE;
    respondWith({ ...rest, pageInfo: pagination });

    const state = await prefetch("webhooks");

    expect(state.queries).toHaveLength(0);
    expect(reports[0]?.resource).toBe("/webhooks?limit=20");
    expect(reports[0]?.issues).toEqual([
      expect.objectContaining({ path: "pagination" }),
    ]);
  });

  it("hydrates nothing for a members page whose rows are not members", async () => {
    respondWith({ data: [{ nonsense: true }], pagination: { limit: 20, hasMore: false, nextCursor: null } });

    const state = await prefetch("users");

    expect(
      state.queries.some((entry) => entry.queryKey[2] === "list"),
    ).toBe(false);
    expect(reports.length).toBeGreaterThan(0);
  });
});
