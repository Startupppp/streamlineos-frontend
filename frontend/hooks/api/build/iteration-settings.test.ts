import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import type { ReactNode } from "react";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import {
  iterationSettingsSchema,
  cycleDateRangesOverlap,
  proposedCycleOverlapsExisting,
} from "./iteration-settings-schema";
import { useUpdateIterationSettings } from "./iteration-settings";
import type { IterationSettings, CycleDateRange } from "./iteration-settings-schema";

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn().mockReturnValue(true),
  useAccess: jest.fn().mockReturnValue({
    data: {
      isOrgOwner: false,
      scopes: { "build:update": "all", "build:view": "all" },
      modules: {},
    },
    refetch: jest.fn(),
  }),
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    get: jest.fn(),
    patch: jest.fn(),
  },
}));

jest.mock("@/lib/api-envelope", () => ({
  lazyContract: (factory: () => unknown) => factory,
}));

function makeClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function wrap(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client }, children);
  };
}

describe("iterationSettingsSchema — contract (C5)", () => {
  it("accepts a well-formed iteration settings response with defaults", () => {
    const result = iterationSettingsSchema.safeParse({
      defaultDurationWeeks: 2,
      namingPrefix: "Cycle",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.defaultDurationWeeks).toBe(2);
      expect(result.data.namingPrefix).toBe("Cycle");
    }
  });

  it("rejects a response missing namingPrefix — a null prefix would render unnamed cycles in the creation form", () => {
    expect(
      iterationSettingsSchema.safeParse({ defaultDurationWeeks: 2 }).success,
    ).toBe(false);
  });

  it("accepts all four valid duration values — 1, 2, 3, 4 weeks are the supported cadences", () => {
    for (const weeks of [1, 2, 3, 4]) {
      expect(
        iterationSettingsSchema.safeParse({ defaultDurationWeeks: weeks, namingPrefix: "Sprint" }).success,
      ).toBe(true);
    }
  });
});

describe("buildWorkQueryKeys.projects.iterationSettings — cache key contract (C5)", () => {
  it("produces distinct keys for different projects so project A settings do not pollute project B", () => {
    const key5 = buildWorkQueryKeys.projects.iterationSettings(5);
    const key6 = buildWorkQueryKeys.projects.iterationSettings(6);
    expect(key5).not.toEqual(key6);
  });

  it("contains the projectId so the key is project-scoped", () => {
    const key = buildWorkQueryKeys.projects.iterationSettings(42);
    expect(key).toContain(42);
  });
});

describe("useUpdateIterationSettings — invalidation contract (C5)", () => {
  let client: QueryClient;
  let invalidateSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    client = makeClient();
    invalidateSpy = jest.spyOn(client, "invalidateQueries");
    const { apiClient } = jest.requireMock("@/lib/api-client");
    (apiClient.patch as jest.Mock).mockResolvedValue({
      defaultDurationWeeks: 3,
      namingPrefix: "Sprint",
    } satisfies IterationSettings);
  });

  it("invalidates the iteration-settings key for the correct project after update", async () => {
    const { result } = renderHook(() => useUpdateIterationSettings(10), {
      wrapper: wrap(client),
    });

    await act(async () => {
      await result.current.mutateAsync({ defaultDurationWeeks: 3 });
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalled();
    });

    const calledKeys = invalidateSpy.mock.calls.map(
      (call) => JSON.stringify((call[0] as { queryKey?: unknown }).queryKey ?? call[0]),
    );
    const expectedKey = JSON.stringify(buildWorkQueryKeys.projects.iterationSettings(10));
    expect(calledKeys.some((k) => k === expectedKey)).toBe(true);
  });

  it("patches the cache optimistically with the response so the form reflects the saved value without a refetch", async () => {
    const settingsKey = buildWorkQueryKeys.projects.iterationSettings(10);
    client.setQueryData<IterationSettings>(settingsKey, {
      defaultDurationWeeks: 2,
      namingPrefix: "Cycle",
    });

    const { result } = renderHook(() => useUpdateIterationSettings(10), {
      wrapper: wrap(client),
    });

    await act(async () => {
      await result.current.mutateAsync({ namingPrefix: "Sprint" });
    });

    await waitFor(() => {
      const cached = client.getQueryData<IterationSettings>(settingsKey);
      expect(cached?.namingPrefix).toBe("Sprint");
    });
  });

  it("calls the correct PATCH endpoint for the project", async () => {
    const { apiClient } = jest.requireMock("@/lib/api-client");
    const { result } = renderHook(() => useUpdateIterationSettings(10), {
      wrapper: wrap(client),
    });

    await act(async () => {
      await result.current.mutateAsync({ defaultDurationWeeks: 1 });
    });

    expect(apiClient.patch).toHaveBeenCalledWith(
      "/build/10/settings/iterations",
      { defaultDurationWeeks: 1 },
      undefined,
      expect.anything(),
    );
  });
});

describe("cycleDateRangesOverlap — cycle-designer overlap denial", () => {
  it("detects an exact duplicate date range as overlapping", () => {
    const a: CycleDateRange = { startDate: "2026-09-01", endDate: "2026-09-14" };
    const b: CycleDateRange = { startDate: "2026-09-01", endDate: "2026-09-14" };
    expect(cycleDateRangesOverlap(a, b)).toBe(true);
  });

  it("detects partial overlap when the new cycle starts before the existing cycle ends", () => {
    const existing: CycleDateRange = { startDate: "2026-09-01", endDate: "2026-09-14" };
    const proposed: CycleDateRange = { startDate: "2026-09-10", endDate: "2026-09-21" };
    expect(cycleDateRangesOverlap(existing, proposed)).toBe(true);
  });

  it("detects overlap when the new cycle completely contains an existing cycle", () => {
    const existing: CycleDateRange = { startDate: "2026-09-05", endDate: "2026-09-10" };
    const proposed: CycleDateRange = { startDate: "2026-09-01", endDate: "2026-09-14" };
    expect(cycleDateRangesOverlap(existing, proposed)).toBe(true);
  });

  it("detects overlap when ranges share only the boundary date", () => {
    const existing: CycleDateRange = { startDate: "2026-09-01", endDate: "2026-09-14" };
    const proposed: CycleDateRange = { startDate: "2026-09-14", endDate: "2026-09-28" };
    expect(cycleDateRangesOverlap(existing, proposed)).toBe(true);
  });

  it("allows a non-overlapping cycle immediately after an existing one", () => {
    const existing: CycleDateRange = { startDate: "2026-09-01", endDate: "2026-09-14" };
    const proposed: CycleDateRange = { startDate: "2026-09-15", endDate: "2026-09-28" };
    expect(cycleDateRangesOverlap(existing, proposed)).toBe(false);
  });

  it("allows a non-overlapping cycle that ends before an existing one starts", () => {
    const existing: CycleDateRange = { startDate: "2026-10-01", endDate: "2026-10-14" };
    const proposed: CycleDateRange = { startDate: "2026-09-01", endDate: "2026-09-30" };
    expect(cycleDateRangesOverlap(existing, proposed)).toBe(false);
  });
});

describe("proposedCycleOverlapsExisting — overlap denial across a list of existing cycles", () => {
  const existingCycles: CycleDateRange[] = [
    { startDate: "2026-08-01", endDate: "2026-08-14" },
    { startDate: "2026-09-01", endDate: "2026-09-14" },
    { startDate: "2026-10-01", endDate: "2026-10-14" },
  ];

  it("returns true when the proposed cycle overlaps any existing cycle", () => {
    const proposed: CycleDateRange = { startDate: "2026-09-08", endDate: "2026-09-21" };
    expect(proposedCycleOverlapsExisting(proposed, existingCycles)).toBe(true);
  });

  it("returns false when the proposed cycle fits cleanly between two existing cycles", () => {
    const proposed: CycleDateRange = { startDate: "2026-08-15", endDate: "2026-08-31" };
    expect(proposedCycleOverlapsExisting(proposed, existingCycles)).toBe(false);
  });

  it("returns false for an empty existing cycles list", () => {
    const proposed: CycleDateRange = { startDate: "2026-09-01", endDate: "2026-09-14" };
    expect(proposedCycleOverlapsExisting(proposed, [])).toBe(false);
  });
});
