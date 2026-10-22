jest.mock("server-only", () => ({}));

jest.mock("@/lib/get-server-auth", () => ({
  getServerAuth: jest.fn(),
}));

jest.mock("@/lib/server-fetch", () => ({
  serverGet: jest.fn(),
}));

jest.mock("@/lib/prefetch/prefetch-gate", () => ({
  resolvePrefetchGate: jest.fn().mockResolvedValue({ can: () => false }),
}));

import { hydrate } from "@tanstack/react-query";
import { createAppQueryClient } from "@/components/providers/query-provider";
import { queryKeys } from "@/lib/query-keys";
import { authenticatedScope } from "@/lib/query-scope";
import { getServerAuth } from "@/lib/get-server-auth";
import { serverGet } from "@/lib/server-fetch";
import { prefetchDashboard } from "./dashboard";

const ORG = "org-a";
const USER = "user-1";

const STATS = {
  orgName: "Acme",
  orgSlug: "acme",
  totalEmployees: 42,
  activeProjects: 5,
  presentToday: 30,
};

beforeEach(() => {
  jest.clearAllMocks();
  (getServerAuth as jest.Mock).mockResolvedValue({
    backendJwt: "token",
    orgId: ORG,
    user: { id: USER },
  });
});

describe("prefetchDashboard", () => {
  it("seeds dashboard stats for the home page", async () => {
    (serverGet as jest.Mock).mockImplementation((path: string) =>
      Promise.resolve(path === "/dashboard/stats" ? STATS : { widgets: [] }),
    );

    const state = await prefetchDashboard();
    const app = createAppQueryClient(authenticatedScope(ORG, USER));
    hydrate(app, state);

    expect(app.getQueryData(queryKeys.dashboard.stats())).toEqual(STATS);
    expect((serverGet as jest.Mock).mock.calls.map((c: unknown[]) => c[0])).toEqual([
      "/dashboard/stats",
      "/dashboard/personal",
    ]);
  });

  it("returns an empty snapshot when the stats prefetch fails, so the page still renders without hydration", async () => {
    (serverGet as jest.Mock).mockRejectedValue(new Error("session unavailable"));

    const state = await prefetchDashboard();

    expect(state.queries).toHaveLength(0);
  });
});
