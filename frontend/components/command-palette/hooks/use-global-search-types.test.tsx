import type { ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useGlobalSearch } from "./use-global-search";
import { globalSearchContract } from "./global-search-schema";

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn() },
}));

const mockedGet = apiClient.get as jest.Mock;

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

const EMPLOYEE = {
  id: "user_42",
  type: "employee",
  title: "Asha Rao",
  subtitle: "asha@acme.test",
  href: "/hr/employees/user_42",
};
const LEAD = {
  id: 7,
  type: "lead",
  title: "Acme lead",
  subtitle: "Lead",
  href: "/crm/leads/7",
};

describe("global search contract matches the backend result shape", () => {
  it("decodes a string id and every module type the backend can return", () => {
    const parsed = globalSearchContract.parse({
      results: [
        EMPLOYEE,
        { id: 3, type: "doc_page", title: "Onboarding", subtitle: "Doc", href: "/knowledge/wiki/doc/3", status: "published" },
        { id: 9, type: "calendar_event", title: "Standup", subtitle: "2026-10-21", href: "/calendar?event=9" },
        { id: 12, type: "support_ticket", title: "Login broken", subtitle: "Ticket #12", href: "/support/inbox?ticket=12", status: "OPEN" },
        LEAD,
      ],
      total: 5,
    });
    expect(parsed.results.map((r) => r.id)).toEqual(["user_42", 3, 9, 12, 7]);
  });

  it("rejects a type the backend never emits, so drift fails loudly instead of rendering a blank row", () => {
    expect(() =>
      globalSearchContract.parse({ results: [{ ...LEAD, type: "invoice" }], total: 1 }),
    ).toThrow();
  });

  it("requires total, which the backend always sends", () => {
    expect(() => globalSearchContract.parse({ results: [] })).toThrow();
  });
});

describe("useGlobalSearch types filter", () => {
  afterEach(() => jest.clearAllMocks());

  it("omits types for the command palette so the backend keeps returning only the legacy set", async () => {
    mockedGet.mockResolvedValue({ results: [LEAD], total: 1 });
    renderHook(() => useGlobalSearch("acme"), { wrapper: makeWrapper() });
    await waitFor(() => expect(mockedGet).toHaveBeenCalled());
    expect(mockedGet.mock.calls[0][1]).toEqual({ q: "acme" });
  });

  it("sends the requested types as one comma list", async () => {
    mockedGet.mockResolvedValue({ results: [EMPLOYEE], total: 1 });
    const { result } = renderHook(() => useGlobalSearch("asha", ["employee", "lead"]), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.results).toHaveLength(1));
    expect(mockedGet.mock.calls[0][1]).toEqual({ q: "asha", types: "employee,lead" });
    expect(result.current.results[0].id).toBe("user_42");
  });

  it("keeps a typed search and the palette search in separate cache entries for the same text", async () => {
    mockedGet.mockResolvedValue({ results: [], total: 0 });
    const wrapper = makeWrapper();
    renderHook(
      () => {
        useGlobalSearch("acme");
        useGlobalSearch("acme", ["employee"]);
      },
      { wrapper },
    );
    await waitFor(() => expect(mockedGet).toHaveBeenCalledTimes(2));
  });

  it("drops results outside the requested types, so the palette never receives a type it cannot render", async () => {
    mockedGet.mockResolvedValue({ results: [EMPLOYEE, LEAD], total: 2 });
    const { result } = renderHook(() => useGlobalSearch("acme"), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.results).toHaveLength(1));
    expect(result.current.results[0].type).toBe("lead");
  });
});
