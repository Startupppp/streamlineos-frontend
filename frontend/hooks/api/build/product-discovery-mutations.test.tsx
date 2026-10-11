import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import type { ReactNode } from "react";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import {
  useOverrideOpportunityScore,
  useScoreOpportunity,
  useUpdateOpportunity,
} from "./product-discovery-mutations";

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn().mockReturnValue(true),
  useAccess: jest.fn().mockReturnValue({
    data: { isOrgOwner: false, scopes: { "build:managed-products:update": "all" }, modules: {} },
    refetch: jest.fn(),
  }),
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

jest.mock("@/lib/api-envelope", () => ({
  lazyContract: (factory: () => unknown) => factory,
}));

jest.mock("@/hooks/api/build/roadmap", () => ({ addRoadmapItemToCache: jest.fn() }));

const PRODUCT_ID = 39;
const OPP_ID = 1;
const keys = buildWorkQueryKeys.projects.managedProducts;

const LATEST_SCORE = {
  scoreVersion: 2,
  computedScore: "480.0000",
  effectiveScore: "480.0000",
  isOverride: false,
  overrideScore: null,
  overrideReason: null,
};

function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: OPP_ID,
    title: "QA opportunity",
    state: "identified",
    version: 3,
    owner: { membershipId: 7, name: null },
    latestScore: null,
    scoreStatus: "unscored",
    allowedActions: ["view", "edit", "score"],
    ...overrides,
  };
}

function getApiClient() {
  return (jest.requireMock("@/lib/api-client") as {
    apiClient: { post: jest.Mock; patch: jest.Mock };
  }).apiClient;
}

function seedClient() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  client.setQueryData(keys.opportunities(PRODUCT_ID), {
    data: [makeRow()],
    pagination: { nextCursor: null, hasMore: false },
  });
  client.setQueryData(keys.opportunity(PRODUCT_ID, OPP_ID), makeRow({ evidence: [] }));
  client.setQueryData(keys.opportunityTrace(PRODUCT_ID, OPP_ID), { opportunity: makeRow() });
  return client;
}

function wrap(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client }, children);
  };
}

type ListCache = { data: Array<Record<string, unknown>> };

describe("discovery mutations — cache patches skip detail and trace entries under the list prefix", () => {
  beforeEach(() => jest.clearAllMocks());

  it("saves a score without throwing when the opportunity detail is cached, and patches list and detail", async () => {
    getApiClient().post.mockResolvedValue({ latestScore: LATEST_SCORE });
    const client = seedClient();
    const onSuccess = jest.fn();
    const { result } = renderHook(() => useScoreOpportunity(PRODUCT_ID), { wrapper: wrap(client) });

    await act(async () => {
      await result.current.mutateAsync(
        {
          opportunityId: OPP_ID,
          reach: 600,
          reachPeriod: "quarter",
          impact: "1",
          confidence: 0.8,
          effort: 1,
          effortUnit: "person_weeks",
          expectedScoreVersion: 1,
        },
        { onSuccess },
      );
    });

    expect(onSuccess).toHaveBeenCalled();
    const list = client.getQueryData<ListCache>(keys.opportunities(PRODUCT_ID));
    expect(list?.data[0]).toMatchObject({ latestScore: LATEST_SCORE, scoreStatus: "scored" });
    expect(client.getQueryData(keys.opportunity(PRODUCT_ID, OPP_ID))).toMatchObject({
      latestScore: LATEST_SCORE,
      evidence: [],
    });
    expect(client.getQueryData(keys.opportunityTrace(PRODUCT_ID, OPP_ID))).toEqual({
      opportunity: makeRow(),
    });
  });

  it("saves an override without throwing when the opportunity detail is cached", async () => {
    const override = { ...LATEST_SCORE, isOverride: true, overrideScore: "900", effectiveScore: "900" };
    getApiClient().post.mockResolvedValue({ latestScore: override });
    const client = seedClient();
    const { result } = renderHook(() => useOverrideOpportunityScore(PRODUCT_ID), {
      wrapper: wrap(client),
    });

    await act(async () => {
      await result.current.mutateAsync({
        opportunityId: OPP_ID,
        overrideScore: 900,
        reason: "board call",
        expectedScoreVersion: 2,
      });
    });

    const list = client.getQueryData<ListCache>(keys.opportunities(PRODUCT_ID));
    expect(list?.data[0]).toMatchObject({ latestScore: override });
  });

  it("moves the opportunity to validating in the list and detail without touching the trace entry", async () => {
    const updated = makeRow({
      state: "validating",
      version: 4,
      allowedActions: ["view", "edit", "score", "accept", "decline"],
    });
    getApiClient().patch.mockResolvedValue(updated);
    const client = seedClient();
    const { result } = renderHook(() => useUpdateOpportunity(PRODUCT_ID), { wrapper: wrap(client) });

    await act(async () => {
      await result.current.mutateAsync({ opportunityId: OPP_ID, version: 3, state: "validating" });
    });

    expect(getApiClient().patch).toHaveBeenCalledWith(
      `/build/managed-products/${PRODUCT_ID}/opportunities/${OPP_ID}`,
      { version: 3, state: "validating" },
      undefined,
      expect.anything(),
    );
    const list = client.getQueryData<ListCache>(keys.opportunities(PRODUCT_ID));
    expect(list?.data[0]).toMatchObject({ state: "validating", version: 4 });
    expect(client.getQueryData(keys.opportunity(PRODUCT_ID, OPP_ID))).toMatchObject({
      state: "validating",
      version: 4,
      evidence: [],
    });
    expect(client.getQueryData(keys.opportunityTrace(PRODUCT_ID, OPP_ID))).toEqual({
      opportunity: makeRow(),
    });
  });
});
