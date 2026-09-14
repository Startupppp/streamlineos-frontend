jest.mock("server-only", () => ({}));

jest.mock("@/lib/get-server-auth", () => ({
  getServerAuth: jest.fn(),
}));

jest.mock("@/lib/rbac/get-server-access", () => ({
  getServerAccess: jest.fn(),
}));

jest.mock("@/lib/server-fetch", () => ({
  serverGet: jest.fn(),
}));

import { hydrate } from "@tanstack/react-query";
import { createAppQueryClient } from "@/components/providers/query-provider";
import { queryKeys } from "@/lib/query-keys";
import { authenticatedScope } from "@/lib/query-scope";
import { getServerAuth } from "@/lib/get-server-auth";
import { getServerAccess } from "@/lib/rbac/get-server-access";
import { serverGet } from "@/lib/server-fetch";
import { prefetchDashboardStats } from "./dashboard";

const ORG = "org-a";
const USER = "user-1";

const STATS = {
  orgName: "Acme",
  orgSlug: "acme",
  totalEmployees: 42,
  activeProjects: 5,
  presentToday: 30,
};

const CHECKLISTS = [
  {
    id: 1,
    orgId: ORG,
    moduleKey: "HR",
    status: "in_progress",
    progress: 40,
    dismissedAt: null,
    completedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    items: [],
  },
];

const ACCESS_WITH_CHECKLIST_VIEW = {
  isOrgOwner: false,
  scopes: { "onboarding:module-checklists:view": "all" },
  modules: {},
  canManageOrganizationMembership: false,
};

const ACCESS_WITHOUT_CHECKLIST_VIEW = {
  isOrgOwner: false,
  scopes: {},
  modules: {},
  canManageOrganizationMembership: false,
};

const ACCESS_ORG_OWNER = {
  isOrgOwner: true,
  scopes: {},
  modules: {},
  canManageOrganizationMembership: true,
};

beforeEach(() => {
  jest.clearAllMocks();
  (getServerAuth as jest.Mock).mockResolvedValue({
    backendJwt: "token",
    orgId: ORG,
    user: { id: USER },
  });
});

describe("prefetchDashboardStats — module-checklists prefetch prevents the settle-deadline skeleton", () => {
  it("seeds module-checklists under the key useModuleChecklists reads so isLoading is false on first render, avoiding the SETUP_BANNER_SETTLE_DEADLINE_MS full-page skeleton", async () => {
    (getServerAccess as jest.Mock).mockResolvedValue(ACCESS_WITH_CHECKLIST_VIEW);
    (serverGet as jest.Mock)
      .mockResolvedValueOnce(STATS)
      .mockResolvedValueOnce(CHECKLISTS);

    const state = await prefetchDashboardStats();
    const app = createAppQueryClient(authenticatedScope(ORG, USER));
    hydrate(app, state);

    expect(app.getQueryData(queryKeys.onboardingFlow.moduleChecklists())).toEqual(CHECKLISTS);
  });

  it("fires no module-checklists request when the user lacks onboarding:module-checklists:view, avoiding a predictable 403 on the first dashboard render", async () => {
    (getServerAccess as jest.Mock).mockResolvedValue(ACCESS_WITHOUT_CHECKLIST_VIEW);
    (serverGet as jest.Mock).mockResolvedValue(STATS);

    await prefetchDashboardStats();

    const calls = (serverGet as jest.Mock).mock.calls.map((c: unknown[]) => c[0]);
    expect(calls).not.toContain("/onboarding/module-checklists");
  });

  it("seeds module-checklists for org owners because isOrgOwner bypasses the scopes check, preventing the full-page skeleton for owners on every sign-in", async () => {
    (getServerAccess as jest.Mock).mockResolvedValue(ACCESS_ORG_OWNER);
    (serverGet as jest.Mock)
      .mockResolvedValueOnce(STATS)
      .mockResolvedValueOnce(CHECKLISTS);

    const state = await prefetchDashboardStats();
    const app = createAppQueryClient(authenticatedScope(ORG, USER));
    hydrate(app, state);

    expect(app.getQueryData(queryKeys.onboardingFlow.moduleChecklists())).toEqual(CHECKLISTS);
  });

  it("still hydrates dashboard stats when the module-checklists fetch fails, so a 403 on that endpoint does not wipe the rest of the dehydrated state", async () => {
    (getServerAccess as jest.Mock).mockResolvedValue(ACCESS_WITH_CHECKLIST_VIEW);
    (serverGet as jest.Mock)
      .mockResolvedValueOnce(STATS)
      .mockRejectedValueOnce(Object.assign(new Error("forbidden"), { status: 403 }));

    const state = await prefetchDashboardStats();
    const app = createAppQueryClient(authenticatedScope(ORG, USER));
    hydrate(app, state);

    expect(app.getQueryData(queryKeys.onboardingFlow.moduleChecklists())).toBeUndefined();
    expect(app.getQueryData(queryKeys.dashboard.stats())).toEqual(STATS);
  });

  it("returns an empty snapshot when getServerAccess itself fails, so the page still renders without hydration", async () => {
    (getServerAccess as jest.Mock).mockRejectedValue(new Error("session unavailable"));

    const state = await prefetchDashboardStats();

    expect(state.queries).toHaveLength(0);
  });
});
