import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { apiClient } from "@/lib/api-client";
import { DEFAULT_PAGE_SIZE } from "@/lib/list-pagination";
import { useHrEmployeeOptions } from "@/hooks/api/hr/employee-list";


jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn().mockReturnValue(true),
  useModuleEnabled: jest.fn().mockReturnValue(true),
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

const mockedGet = jest.mocked(apiClient.get);

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  mockedGet.mockReset();
  mockedGet.mockResolvedValue({ data: [], pageInfo: { limit: DEFAULT_PAGE_SIZE, hasMore: false, nextCursor: null } });
});

describe("useHrEmployeeOptions", () => {
  it("asks for every non-deactivated member, not only those who accepted their invite", async () => {
    renderHook(() => useHrEmployeeOptions(), { wrapper });
    await waitFor(() => expect(mockedGet).toHaveBeenCalled());
    expect(mockedGet.mock.calls[0][1]).toEqual(expect.objectContaining({ isActive: "current", limit: DEFAULT_PAGE_SIZE }));
  });

  it("still lets a caller widen to deactivated people", async () => {
    renderHook(() => useHrEmployeeOptions({ isActive: "all" }), { wrapper });
    await waitFor(() => expect(mockedGet).toHaveBeenCalled());
    expect(mockedGet.mock.calls[0][1]).toEqual(expect.objectContaining({ isActive: "all" }));
  });
});
