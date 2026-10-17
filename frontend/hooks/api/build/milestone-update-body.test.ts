import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import type { ReactNode } from "react";
import { useUpdateMilestone } from "./milestones";
import { milestoneUpdateRequestContract } from "./workspace-schema";

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    patch: jest.fn(),
  },
}));

jest.mock("@/hooks/api/access", () => ({
  useAccess: jest.fn(() => ({
    data: {
      isOrgOwner: false,
      scopes: { "build:workspace:manage": "all" },
      modules: {},
    },
    refetch: jest.fn(),
  })),
  useCan: jest.fn().mockReturnValue(true),
}));

const { apiClient } = jest.requireMock("@/lib/api-client");

function wrap(client: QueryClient) {
  return function Wrap({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client }, children);
  };
}

async function patchBody(): Promise<Record<string, unknown>> {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  apiClient.patch.mockReset().mockResolvedValue({ id: 3, version: 8 });
  const { result } = renderHook(() => useUpdateMilestone(42), {
    wrapper: wrap(client),
  });
  await act(async () => {
    await result.current.mutateAsync({
      milestoneId: 3,
      version: 7,
      status: "ACHIEVED",
    });
  });
  return apiClient.patch.mock.calls[0][1] as Record<string, unknown>;
}

it("puts the version token in the body the milestone update request sends", async () => {
  const body = await patchBody();
  expect(body).toEqual({ version: 7, status: "ACHIEVED" });
});

it("sends a milestone update body the backend update schema accepts", async () => {
  const body = await patchBody();
  expect(milestoneUpdateRequestContract.safeParse(body).success).toBe(true);
});

it("would be rejected by the backend update schema if the milestone writer dropped the token", async () => {
  const body = await patchBody();
  const withoutToken: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (key !== "version") withoutToken[key] = value;
  }
  expect(milestoneUpdateRequestContract.safeParse(withoutToken).success).toBe(false);
});

it("keeps the milestone id out of the body, because it is a path parameter", async () => {
  const body = await patchBody();
  expect(body.milestoneId).toBeUndefined();
  expect(apiClient.patch.mock.calls[0][0]).toBe("/build/42/milestones/3");
});
