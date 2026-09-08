import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { apiClient } from "@/lib/api-client";
import { useDeleteOrg } from "./organization";
import { useBulkDeleteLeads } from "./leads";

jest.mock("@/hooks/api/access", () => ({
  useAccess: jest.fn(() => ({ data: { scopes: {}, modules: {}, isOrgOwner: false }, refetch: jest.fn() })),
  useCan: jest.fn().mockReturnValue(true),
  useModuleEnabled: jest.fn().mockReturnValue(true),
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    delete: jest.fn(),
  },
  setAutoSignOutSuppressed: jest.fn(),
}));

const mockedDelete = apiClient.delete as jest.Mock;

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("organization mutations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedDelete.mockResolvedValue({ success: true, nextOrgId: null });
  });

  it("sends delete confirmation as the top-level request body", async () => {
    const { result } = renderHook(() => useDeleteOrg(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ confirmation: "Acme" });
    });

    expect(mockedDelete).toHaveBeenCalledWith(
      "/organization",
      { confirmation: "Acme" },
      undefined,
      expect.any(Function),
    );
  });

  it("sends bulk lead deletion input as the top-level request body", async () => {
    const { result } = renderHook(() => useBulkDeleteLeads(), { wrapper });
    const input = { leadIds: [1, 2] };

    await act(async () => {
      await result.current.mutateAsync(input);
    });

    expect(mockedDelete).toHaveBeenCalledWith(
      "/leads/bulk",
      input,
      undefined,
      expect.any(Function),
    );
  });
});
