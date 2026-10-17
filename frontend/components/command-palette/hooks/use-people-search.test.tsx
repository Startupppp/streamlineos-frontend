import type { ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useCan } from "@/hooks/api/access";
import { usePalettePeopleSearch } from "./use-people-search";

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn() },
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(),
  useModuleEnabled: jest.fn().mockReturnValue(true),
}));

const mockedGet = apiClient.get as jest.Mock;
const mockedCan = useCan as jest.Mock;

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("HRMS-UX-017 — palette people search is permission-gated and honest", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("never reads /hr/employees for an actor without hr:employees:view", async () => {
    mockedCan.mockReturnValue(false);

    const { result } = renderHook(() => usePalettePeopleSearch("ami"), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSearching).toBe(false));
    expect(result.current.canSearchPeople).toBe(false);
    expect(result.current.people).toEqual([]);
    expect(result.current.isError).toBe(false);
    expect(mockedGet).not.toHaveBeenCalled();
  });

  it("does not search below the minimum query length", async () => {
    mockedCan.mockReturnValue(true);

    const { result } = renderHook(() => usePalettePeopleSearch("a"), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSearching).toBe(false));
    expect(mockedGet).not.toHaveBeenCalled();
  });

  it("asks the server for the query and caps the page at ten", async () => {
    mockedCan.mockReturnValue(true);
    mockedGet.mockResolvedValue({
      data: [
        {
          id: "emp-1",
          name: "Amitha Rao",
          firstName: null,
          lastName: null,
          email: "amitha@example.com",
          role: "MEMBER",
          designation: "Design Lead",
          employeeId: "E-1",
          image: null,
          isActive: true,
          joiningDate: null,
          reportingTo: null,
          department: null,
        },
      ],
      pageInfo: { limit: 10, hasMore: false, nextCursor: null },
    });

    const { result } = renderHook(() => usePalettePeopleSearch("ami"), {
      wrapper,
    });

    await waitFor(() => expect(result.current.people).toHaveLength(1));
    expect(result.current.people[0]).toEqual({
      id: "emp-1",
      name: "Amitha Rao",
      subtitle: "Design Lead",
      href: "/hr/employees/emp-1",
    });
    expect(mockedGet).toHaveBeenCalledWith(
      "/hr/employees",
      { search: "ami", limit: 10, isActive: "all" },
      expect.anything(),
      expect.anything(),
    );
  });

  it("reports isError rather than a silent empty when the read fails", async () => {
    mockedCan.mockReturnValue(true);
    mockedGet.mockRejectedValue(new Error("500 Internal Server Error"));

    const { result } = renderHook(() => usePalettePeopleSearch("ami"), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.people).toEqual([]);
  });
});
