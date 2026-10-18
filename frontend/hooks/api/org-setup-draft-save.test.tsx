import { act, renderHook } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { createAppQueryClient } from "@/components/providers/query-provider";
import { ApiError } from "@/lib/api-envelope";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import { useOrgSetupDraftSaveMutation } from "@/hooks/api/org-setup";

const mockPut = jest.fn();
const mockGet = jest.fn();

jest.mock("@/lib/dom-mutation-guard", () => ({}));

jest.mock("next-auth/react", () => ({
  useSession: jest.fn().mockReturnValue({
    data: { orgId: null, user: { id: "u-1" } },
    status: "authenticated",
  }),
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    put: (...args: unknown[]) => mockPut(...args),
    get: (...args: unknown[]) => mockGet(...args),
  },
}));

function wrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

const PAYLOAD = {
  revision: 2,
  stepData: { enabledModules: ["hr"], __currentStep: "workspace" },
  expiresAt: "2099-01-01T00:00:00.000Z",
};

beforeEach(() => {
  mockPut.mockReset();
  mockGet.mockReset();
});

describe("useOrgSetupDraftSaveMutation — ONB-B-004", () => {
  it("writes the saved revision into the draft cache so a remount does not save with a stale revision", async () => {
    const client = createAppQueryClient("authenticated::u-1");
    client.setQueryData(platformCoreQueryKeys.orgSetup.draft(), {
      revision: 2,
      stepData: {},
      expiresAt: PAYLOAD.expiresAt,
    });
    mockPut.mockResolvedValue({ success: true, revision: 3 });
    const { result } = renderHook(() => useOrgSetupDraftSaveMutation(), {
      wrapper: wrapper(client),
    });

    await act(async () => {
      await result.current.mutateAsync(PAYLOAD);
    });

    expect(client.getQueryData(platformCoreQueryKeys.orgSetup.draft())).toEqual({
      revision: 3,
      stepData: PAYLOAD.stepData,
      expiresAt: PAYLOAD.expiresAt,
    });
  });

  it("recovers from a revision conflict by saving the latest values on the current server revision", async () => {
    const client = createAppQueryClient("authenticated::u-1");
    mockPut
      .mockRejectedValueOnce(new ApiError("conflict", 409, "DRAFT_REVISION_CONFLICT"))
      .mockResolvedValueOnce({ success: true, revision: 6 });
    mockGet.mockResolvedValue({ revision: 5, stepData: {}, expiresAt: PAYLOAD.expiresAt });
    const { result } = renderHook(() => useOrgSetupDraftSaveMutation(), {
      wrapper: wrapper(client),
    });

    let saved: { revision: number } | undefined;
    await act(async () => {
      saved = await result.current.mutateAsync(PAYLOAD);
    });

    expect(saved?.revision).toBe(6);
    expect(mockPut).toHaveBeenCalledTimes(2);
    expect(mockPut.mock.calls[1]?.[1]).toEqual({ ...PAYLOAD, revision: 5 });
  });

  it("does not retry a failure that is not a conflict", async () => {
    const client = createAppQueryClient("authenticated::u-1");
    mockPut.mockRejectedValueOnce(new ApiError("down", 503));
    const { result } = renderHook(() => useOrgSetupDraftSaveMutation(), {
      wrapper: wrapper(client),
    });

    await act(async () => {
      await expect(result.current.mutateAsync(PAYLOAD)).rejects.toThrow("down");
    });

    expect(mockPut).toHaveBeenCalledTimes(1);
    expect(mockGet).not.toHaveBeenCalled();
  });
});
